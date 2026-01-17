/**
 * Recipe collection data access layer
 * Supports organizing recipes into groups and sharing via Copy-on-Share model
 */

import { query, transaction } from "./db";
import {
  Collection,
  CollectionRow,
  CollectionItem,
  CollectionItemRow,
  CollectionSummary,
  CollectionWithRecipes,
  ReceivedCollection,
  SentCollection,
  CreateCollectionInput,
  UpdateCollectionInput,
  rowToCollection,
  rowToCollectionItem,
} from "./collection-types";
import { RecipeJson, RecipeSummary, generateSlug } from "./recipe-types";

// ============================================
// Constants
// ============================================

const COLLECTION_NAME_MAX_LENGTH = 100;

// ============================================
// Collection CRUD Functions
// ============================================

/**
 * Create a new collection
 */
export async function createCollection(
  userId: number,
  input: CreateCollectionInput
): Promise<Collection> {
  // Validate name length (database allows VARCHAR(100))
  if (input.name.length > COLLECTION_NAME_MAX_LENGTH) {
    throw new Error(
      `Collection name must be ${COLLECTION_NAME_MAX_LENGTH} characters or less`
    );
  }

  const result = await query<CollectionRow>(
    `INSERT INTO recipe_collections (user_id, name, description, cover_image_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, input.name, input.description ?? null, input.coverImageUrl ?? null]
  );

  return rowToCollection(result.rows[0]);
}

/**
 * Get all collections for a user as summaries (lightweight for list views)
 */
export async function getUserCollections(
  userId: number
): Promise<CollectionSummary[]> {
  const result = await query<{
    id: number;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    updated_at: Date;
    recipe_count: string;
  }>(
    `SELECT
      rc.id,
      rc.name,
      rc.description,
      rc.cover_image_url,
      rc.updated_at,
      COUNT(rci.id)::text as recipe_count
     FROM recipe_collections rc
     LEFT JOIN recipe_collection_items rci ON rci.collection_id = rc.id
     WHERE rc.user_id = $1
     GROUP BY rc.id
     ORDER BY rc.updated_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    recipeCount: parseInt(row.recipe_count, 10),
    updatedAt: row.updated_at,
  }));
}

/**
 * Get a single collection with its recipes
 */
export async function getCollection(
  userId: number,
  collectionId: number
): Promise<CollectionWithRecipes | null> {
  // Get the collection
  const collectionResult = await query<CollectionRow>(
    `SELECT * FROM recipe_collections
     WHERE id = $1 AND user_id = $2`,
    [collectionId, userId]
  );

  if (collectionResult.rows.length === 0) {
    return null;
  }

  const collection = rowToCollection(collectionResult.rows[0]);

  // Get the recipes in the collection
  const recipes = await getCollectionRecipes(userId, collectionId);

  return {
    ...collection,
    recipes,
    recipeCount: recipes.length,
  };
}

/**
 * Update collection metadata
 */
export async function updateCollection(
  userId: number,
  collectionId: number,
  input: UpdateCollectionInput
): Promise<Collection> {
  // Validate name length if provided (database allows VARCHAR(100))
  if (input.name !== undefined && input.name.length > COLLECTION_NAME_MAX_LENGTH) {
    throw new Error(
      `Collection name must be ${COLLECTION_NAME_MAX_LENGTH} characters or less`
    );
  }

  // Build dynamic UPDATE query based on provided fields
  const updates: string[] = [];
  const values: (string | number | null)[] = [collectionId, userId];
  let paramIndex = 3;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.coverImageUrl !== undefined) {
    updates.push(`cover_image_url = $${paramIndex++}`);
    values.push(input.coverImageUrl);
  }

  if (updates.length === 0) {
    // Nothing to update, return current collection
    const result = await query<CollectionRow>(
      `SELECT * FROM recipe_collections WHERE id = $1 AND user_id = $2`,
      [collectionId, userId]
    );
    if (result.rows.length === 0) {
      throw new Error("Collection not found");
    }
    return rowToCollection(result.rows[0]);
  }

  updates.push("updated_at = NOW()");

  const result = await query<CollectionRow>(
    `UPDATE recipe_collections
     SET ${updates.join(", ")}
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error("Collection not found");
  }

  return rowToCollection(result.rows[0]);
}

/**
 * Delete a collection (does NOT delete recipes)
 */
export async function deleteCollection(
  userId: number,
  collectionId: number
): Promise<void> {
  const result = await query(
    `DELETE FROM recipe_collections WHERE id = $1 AND user_id = $2`,
    [collectionId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error("Collection not found");
  }
}

// ============================================
// Recipe Management Within Collections
// ============================================

/**
 * Add a recipe to a collection
 */
export async function addRecipeToCollection(
  userId: number,
  collectionId: number,
  recipeId: number
): Promise<CollectionItem> {
  return transaction(async (client) => {
    // Verify user owns the collection
    const collectionCheck = await client.query<{ id: number }>(
      `SELECT id FROM recipe_collections WHERE id = $1 AND user_id = $2`,
      [collectionId, userId]
    );
    if (collectionCheck.rows.length === 0) {
      throw new Error("Collection not found or not owned by user");
    }

    // Verify user owns the recipe
    const recipeCheck = await client.query<{ id: number }>(
      `SELECT id FROM recipes WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [recipeId, userId]
    );
    if (recipeCheck.rows.length === 0) {
      throw new Error("Recipe not found or not owned by user");
    }

    // Get the next position
    const positionResult = await client.query<{ max_position: number | null }>(
      `SELECT MAX(position) as max_position
       FROM recipe_collection_items
       WHERE collection_id = $1`,
      [collectionId]
    );
    const nextPosition = (positionResult.rows[0]?.max_position ?? -1) + 1;

    // Insert the item
    const result = await client.query<CollectionItemRow>(
      `INSERT INTO recipe_collection_items (collection_id, recipe_id, position)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [collectionId, recipeId, nextPosition]
    );

    // Update collection's updated_at
    await client.query(
      `UPDATE recipe_collections SET updated_at = NOW() WHERE id = $1`,
      [collectionId]
    );

    return rowToCollectionItem(result.rows[0]);
  });
}

/**
 * Remove a recipe from a collection
 */
export async function removeRecipeFromCollection(
  userId: number,
  collectionId: number,
  recipeId: number
): Promise<void> {
  return transaction(async (client) => {
    // Verify user owns the collection
    const collectionCheck = await client.query<{ id: number }>(
      `SELECT id FROM recipe_collections WHERE id = $1 AND user_id = $2`,
      [collectionId, userId]
    );
    if (collectionCheck.rows.length === 0) {
      throw new Error("Collection not found or not owned by user");
    }

    // Remove the item
    const result = await client.query(
      `DELETE FROM recipe_collection_items
       WHERE collection_id = $1 AND recipe_id = $2`,
      [collectionId, recipeId]
    );

    if (result.rowCount === 0) {
      throw new Error("Recipe not in collection");
    }

    // Update collection's updated_at
    await client.query(
      `UPDATE recipe_collections SET updated_at = NOW() WHERE id = $1`,
      [collectionId]
    );
  });
}

/**
 * Reorder recipes within a collection
 */
export async function reorderCollectionItems(
  userId: number,
  collectionId: number,
  recipeIds: number[]
): Promise<void> {
  return transaction(async (client) => {
    // Verify user owns the collection
    const collectionCheck = await client.query<{ id: number }>(
      `SELECT id FROM recipe_collections WHERE id = $1 AND user_id = $2`,
      [collectionId, userId]
    );
    if (collectionCheck.rows.length === 0) {
      throw new Error("Collection not found or not owned by user");
    }

    // Update positions for all recipes in a single bulk UPDATE using CTE
    // This avoids N+1 queries when reordering large collections
    if (recipeIds.length > 0) {
      // Build values list: (recipe_id, new_position)
      const values = recipeIds.map((id, idx) => `(${id}, ${idx})`).join(", ");

      await client.query(
        `WITH new_positions(recipe_id, position) AS (
           VALUES ${values}
         )
         UPDATE recipe_collection_items rci
         SET position = np.position
         FROM new_positions np
         WHERE rci.collection_id = $1 AND rci.recipe_id = np.recipe_id`,
        [collectionId]
      );
    }

    // Update collection's updated_at
    await client.query(
      `UPDATE recipe_collections SET updated_at = NOW() WHERE id = $1`,
      [collectionId]
    );
  });
}

/**
 * Get recipes in a collection as summaries
 */
export async function getCollectionRecipes(
  userId: number,
  collectionId: number
): Promise<RecipeSummary[]> {
  // Verify user owns the collection
  const collectionCheck = await query<{ id: number }>(
    `SELECT id FROM recipe_collections WHERE id = $1 AND user_id = $2`,
    [collectionId, userId]
  );
  if (collectionCheck.rows.length === 0) {
    throw new Error("Collection not found or not owned by user");
  }

  // Get recipes with lightweight fields for summary
  const result = await query<{
    slug: string;
    title: string;
    description: string | null;
    tags: string[];
    recipe_json: RecipeJson;
    updated_at: Date;
  }>(
    `SELECT r.slug, r.title, r.description, r.tags, r.recipe_json, r.updated_at
     FROM recipes r
     JOIN recipe_collection_items rci ON rci.recipe_id = r.id
     WHERE rci.collection_id = $1 AND r.is_active = true
     ORDER BY rci.position`,
    [collectionId]
  );

  return result.rows.map((row) => {
    const recipeJson = row.recipe_json;
    const images = recipeJson.images || [];
    const primaryImage = images.find((img) => img.isPrimary) ?? images[0];

    return {
      slug: row.slug,
      title: row.title,
      description: row.description ?? recipeJson.description,
      tags: row.tags,
      servings: recipeJson.servings,
      prepTimeMinutes: recipeJson.prepTimeMinutes,
      cookTimeMinutes: recipeJson.cookTimeMinutes,
      primaryImage,
      nutrition: recipeJson.nutrition,
      isFavorite: recipeJson.isFavorite ?? false,
      rating: recipeJson.rating,
      updatedAt: row.updated_at,
    };
  });
}

// ============================================
// Collection Sharing (Copy-on-Share)
// ============================================

/**
 * Share a collection with another user (copies collection AND all recipes)
 * This implements the Copy-on-Share model where the recipient gets their own
 * independent copies that they can modify without affecting the original.
 */
export async function shareCollection(
  senderId: number,
  recipientId: number,
  collectionId: number,
  message?: string
): Promise<{ copiedCollectionId: number; copiedRecipeIds: number[] }> {
  // Prevent self-sharing (creates unnecessary data duplication)
  if (senderId === recipientId) {
    throw new Error("Cannot share collection with yourself");
  }

  return transaction(async (client) => {
    // 1. Verify sender owns the collection
    const collectionResult = await client.query<CollectionRow>(
      `SELECT * FROM recipe_collections
       WHERE id = $1 AND user_id = $2`,
      [collectionId, senderId]
    );
    if (collectionResult.rows.length === 0) {
      throw new Error("Collection not found or not owned by sender");
    }
    const collection = collectionResult.rows[0];

    // 2. Check if already shared with this recipient
    const existingShare = await client.query<{ id: number }>(
      `SELECT id FROM collection_shares
       WHERE original_collection_id = $1
       AND shared_by_user_id = $2
       AND shared_with_user_id = $3`,
      [collectionId, senderId, recipientId]
    );
    if (existingShare.rows.length > 0) {
      throw new Error("Collection already shared with this user");
    }

    // 3. Create copy of collection for recipient
    const copiedCollection = await client.query<{ id: number }>(
      `INSERT INTO recipe_collections
         (user_id, name, description, cover_image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [recipientId, collection.name, collection.description, collection.cover_image_url]
    );
    const copiedCollectionId = copiedCollection.rows[0].id;

    // 4. Get all recipes in the original collection
    const originalItems = await client.query<{
      recipe_id: number;
      position: number;
      slug: string;
      title: string;
      description: string | null;
      locale: string;
      tags: string[];
      recipe_json: RecipeJson;
    }>(
      `SELECT rci.recipe_id, rci.position, r.slug, r.title, r.description,
              r.locale, r.tags, r.recipe_json
       FROM recipe_collection_items rci
       JOIN recipes r ON r.id = rci.recipe_id
       WHERE rci.collection_id = $1 AND r.is_active = true
       ORDER BY rci.position`,
      [collectionId]
    );

    // 5. Copy each recipe and add to new collection
    const copiedRecipeIds: number[] = [];
    for (const item of originalItems.rows) {
      // Get unique slug for recipient (they might already have a recipe with same title)
      const uniqueSlug = await getUniqueSlugForTransaction(client, recipientId, item.title);

      // Create copy of recipe for recipient
      const copiedRecipe = await client.query<{ id: number }>(
        `INSERT INTO recipes
           (user_id, slug, version, title, description, locale, tags, recipe_json)
         VALUES ($1, $2, 1, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          recipientId,
          uniqueSlug,
          item.title,
          item.description,
          item.locale,
          JSON.stringify(item.tags),
          JSON.stringify(item.recipe_json),
        ]
      );
      const copiedRecipeId = copiedRecipe.rows[0].id;
      copiedRecipeIds.push(copiedRecipeId);

      // Add to copied collection with same position
      await client.query(
        `INSERT INTO recipe_collection_items
           (collection_id, recipe_id, position)
         VALUES ($1, $2, $3)`,
        [copiedCollectionId, copiedRecipeId, item.position]
      );
    }

    // 6. Mark original collection as shared
    await client.query(
      `UPDATE recipe_collections SET is_shared = true WHERE id = $1`,
      [collectionId]
    );

    // 7. Record the share
    await client.query(
      `INSERT INTO collection_shares
         (original_collection_id, shared_by_user_id, shared_with_user_id,
          copied_collection_id, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [collectionId, senderId, recipientId, copiedCollectionId, message ?? null]
    );

    return { copiedCollectionId, copiedRecipeIds };
  });
}

/**
 * Helper function to get unique slug within a transaction context
 */
async function getUniqueSlugForTransaction(
  client: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: (text: string, params?: (string | number | null)[]) => Promise<{ rows: any[] }>;
  },
  userId: number,
  title: string
): Promise<string> {
  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await client.query(
      `SELECT COUNT(*) as count FROM recipes WHERE user_id = $1 AND slug = $2`,
      [userId, slug]
    );
    if (parseInt(existing.rows[0].count as string, 10) === 0) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}


/**
 * Get collections shared with a user (inbox view)
 */
export async function getReceivedCollections(
  userId: number
): Promise<ReceivedCollection[]> {
  const result = await query<{
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    is_shared: boolean;
    created_at: Date;
    updated_at: Date;
    sender_id: number;
    sender_name: string;
    sender_email: string;
    message: string | null;
    shared_at: Date;
  }>(
    `SELECT
      rc.id, rc.user_id, rc.name, rc.description, rc.cover_image_url,
      rc.is_shared, rc.created_at, rc.updated_at,
      u.id as sender_id, u.name as sender_name, u.email as sender_email,
      cs.message, cs.created_at as shared_at
     FROM collection_shares cs
     JOIN recipe_collections rc ON rc.id = cs.copied_collection_id
     JOIN users u ON u.id = cs.shared_by_user_id
     WHERE cs.shared_with_user_id = $1
     ORDER BY cs.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    collection: {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      coverImageUrl: row.cover_image_url,
      isShared: row.is_shared,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    sharedBy: {
      id: row.sender_id,
      name: row.sender_name,
      email: row.sender_email,
    },
    message: row.message,
    receivedAt: row.shared_at,
  }));
}

/**
 * Get collections the user has shared (sent view)
 *
 * Note: If the original collection is deleted after sharing, those share records
 * will be excluded from results due to the INNER JOIN. This is intentional behavior -
 * the recipient's copied collection remains intact, but the sender no longer sees
 * that share in their sent history (since the original_collection_id is not a FK
 * and doesn't cascade delete the share record, but the JOIN filters it out).
 */
export async function getSentCollections(
  userId: number
): Promise<SentCollection[]> {
  const result = await query<{
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    is_shared: boolean;
    created_at: Date;
    updated_at: Date;
    recipient_id: number;
    recipient_name: string;
    recipient_email: string;
    message: string | null;
    shared_at: Date;
  }>(
    `SELECT
      rc.id, rc.user_id, rc.name, rc.description, rc.cover_image_url,
      rc.is_shared, rc.created_at, rc.updated_at,
      u.id as recipient_id, u.name as recipient_name, u.email as recipient_email,
      cs.message, cs.created_at as shared_at
     FROM collection_shares cs
     JOIN recipe_collections rc ON rc.id = cs.original_collection_id
     JOIN users u ON u.id = cs.shared_with_user_id
     WHERE cs.shared_by_user_id = $1
     ORDER BY cs.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    collection: {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      coverImageUrl: row.cover_image_url,
      isShared: row.is_shared,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    sharedWith: {
      id: row.recipient_id,
      name: row.recipient_name,
      email: row.recipient_email,
    },
    message: row.message,
    sentAt: row.shared_at,
  }));
}

/**
 * Get user by email (for finding recipients when sharing)
 */
export async function getUserByEmail(
  email: string
): Promise<{ id: number; name: string; email: string } | null> {
  const result = await query<{ id: number; name: string; email: string }>(
    `SELECT id, name, email FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
