/**
 * Recipe sharing data access layer
 * Reference-based sharing with automatic version sync
 */

import { query, transaction } from "./db";
import {
  RecipeShareRow,
  SharedRecipeWithMe,
  MySharedRecipe,
  SharedRecipeDetail,
  SharePermission,
} from "./recipe-sharing-types";
import {
  RecipeRow,
  RecipeVersion,
  rowToRecipe,
  generateSlug,
} from "./recipe-types";

// ============================================
// User Lookup
// ============================================

/**
 * Find a user by email (for recipient lookup when sharing)
 */
export async function findUserByEmail(
  email: string
): Promise<{ id: number; name: string; email: string } | null> {
  const result = await query<{ id: number; name: string; email: string }>(
    `SELECT id, name, email FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return result.rows[0] ?? null;
}

// ============================================
// Share Operations
// ============================================

/**
 * Share a recipe with another user (creates reference, not copy)
 */
export async function shareRecipe(
  ownerId: number,
  recipientId: number,
  recipeId: number,
  permission: SharePermission = "view",
  message?: string
): Promise<{ shareId: number }> {
  // Prevent self-sharing
  if (ownerId === recipientId) {
    throw new Error("Cannot share recipe with yourself");
  }

  return transaction(async (client) => {
    // 1. Verify owner owns the recipe
    const recipeResult = await client.query<{ id: number; slug: string }>(
      `SELECT id, slug FROM recipes
       WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [recipeId, ownerId]
    );
    if (recipeResult.rows.length === 0) {
      throw new Error("Recipe not found or not owned by you");
    }

    // 2. Check if already shared with this recipient
    const existingShare = await client.query<{ id: number }>(
      `SELECT id FROM recipe_shares
       WHERE recipe_id = $1 AND shared_with_user_id = $2`,
      [recipeId, recipientId]
    );
    if (existingShare.rows.length > 0) {
      throw new Error("Recipe already shared with this user");
    }

    // 3. Create share reference
    const shareResult = await client.query<{ id: number }>(
      `INSERT INTO recipe_shares
         (recipe_id, owner_user_id, shared_with_user_id, permission, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [recipeId, ownerId, recipientId, permission, message ?? null]
    );

    return { shareId: shareResult.rows[0].id };
  });
}

/**
 * Unshare a recipe (remove access)
 */
export async function unshareRecipe(
  ownerId: number,
  shareId: number
): Promise<void> {
  const result = await query(
    `DELETE FROM recipe_shares
     WHERE id = $1 AND owner_user_id = $2`,
    [shareId, ownerId]
  );

  if (result.rowCount === 0) {
    throw new Error("Share not found or you are not the owner");
  }
}

/**
 * Update share permission
 */
export async function updateSharePermission(
  ownerId: number,
  shareId: number,
  permission: SharePermission
): Promise<void> {
  const result = await query(
    `UPDATE recipe_shares
     SET permission = $3
     WHERE id = $1 AND owner_user_id = $2`,
    [shareId, ownerId, permission]
  );

  if (result.rowCount === 0) {
    throw new Error("Share not found or you are not the owner");
  }
}

// ============================================
// Query Operations
// ============================================

/**
 * Get recipes shared with me (inbox view)
 */
export async function getSharedWithMe(
  userId: number
): Promise<SharedRecipeWithMe[]> {
  const result = await query<{
    share_id: number;
    recipe_id: number;
    permission: SharePermission;
    message: string | null;
    shared_at: Date;
    owner_id: number;
    owner_name: string;
    owner_email: string;
    slug: string;
    title: string;
    description: string | null;
    tags: string[];
    version: number;
    recipe_json: Record<string, unknown>;
    updated_at: Date;
  }>(
    `SELECT
      rs.id as share_id,
      rs.recipe_id,
      rs.permission,
      rs.message,
      rs.created_at as shared_at,
      u.id as owner_id,
      u.name as owner_name,
      u.email as owner_email,
      r.slug,
      r.title,
      r.description,
      r.tags,
      r.version,
      r.recipe_json,
      r.updated_at
     FROM recipe_shares rs
     JOIN recipes r ON r.id = rs.recipe_id AND r.is_active = true
     JOIN users u ON u.id = rs.owner_user_id
     WHERE rs.shared_with_user_id = $1
     ORDER BY rs.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => {
    const recipeJson = row.recipe_json as {
      servings?: number;
      prepTimeMinutes?: number;
      cookTimeMinutes?: number;
      images?: Array<{ url: string; isPrimary?: boolean }>;
      nutrition: {
        calories: number;
        protein: number;
        carbohydrates: number;
        fat: number;
        fiber?: number;
      };
    };
    const images = recipeJson.images ?? [];
    const primaryImage = images.find((img) => img.isPrimary) ?? images[0];

    return {
      shareId: row.share_id,
      recipeId: row.recipe_id,
      recipe: {
        slug: row.slug,
        title: row.title,
        description: row.description ?? "",
        tags: row.tags,
        servings: recipeJson.servings ?? 1,
        prepTimeMinutes: recipeJson.prepTimeMinutes,
        cookTimeMinutes: recipeJson.cookTimeMinutes,
        primaryImage,
        nutrition: recipeJson.nutrition,
        isFavorite: false,
        updatedAt: row.updated_at,
      },
      owner: {
        id: row.owner_id,
        name: row.owner_name,
        email: row.owner_email,
      },
      permission: row.permission,
      message: row.message,
      sharedAt: row.shared_at,
      currentVersion: row.version,
    };
  });
}

/**
 * Get recipes I've shared with others (sent view)
 */
export async function getMySharedRecipes(
  userId: number
): Promise<MySharedRecipe[]> {
  const result = await query<{
    share_id: number;
    recipe_id: number;
    permission: SharePermission;
    message: string | null;
    shared_at: Date;
    recipient_id: number;
    recipient_name: string;
    recipient_email: string;
    slug: string;
    title: string;
    description: string | null;
    tags: string[];
    recipe_json: Record<string, unknown>;
    updated_at: Date;
  }>(
    `SELECT
      rs.id as share_id,
      rs.recipe_id,
      rs.permission,
      rs.message,
      rs.created_at as shared_at,
      u.id as recipient_id,
      u.name as recipient_name,
      u.email as recipient_email,
      r.slug,
      r.title,
      r.description,
      r.tags,
      r.recipe_json,
      r.updated_at
     FROM recipe_shares rs
     JOIN recipes r ON r.id = rs.recipe_id AND r.is_active = true
     JOIN users u ON u.id = rs.shared_with_user_id
     WHERE rs.owner_user_id = $1
     ORDER BY rs.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => {
    const recipeJson = row.recipe_json as {
      servings?: number;
      prepTimeMinutes?: number;
      cookTimeMinutes?: number;
      images?: Array<{ url: string; isPrimary?: boolean }>;
      nutrition: {
        calories: number;
        protein: number;
        carbohydrates: number;
        fat: number;
        fiber?: number;
      };
    };
    const images = recipeJson.images ?? [];
    const primaryImage = images.find((img) => img.isPrimary) ?? images[0];

    return {
      shareId: row.share_id,
      recipeId: row.recipe_id,
      recipeSummary: {
        slug: row.slug,
        title: row.title,
        description: row.description ?? "",
        tags: row.tags,
        servings: recipeJson.servings ?? 1,
        prepTimeMinutes: recipeJson.prepTimeMinutes,
        cookTimeMinutes: recipeJson.cookTimeMinutes,
        primaryImage,
        nutrition: recipeJson.nutrition,
        isFavorite: false,
        updatedAt: row.updated_at,
      },
      sharedWith: {
        id: row.recipient_id,
        name: row.recipient_name,
        email: row.recipient_email,
      },
      permission: row.permission,
      message: row.message,
      sharedAt: row.shared_at,
    };
  });
}

/**
 * Get a shared recipe by ID with version history (for recipients)
 * Returns null if recipe not shared with user or doesn't exist
 */
export async function getSharedRecipeById(
  userId: number,
  recipeId: number
): Promise<SharedRecipeDetail | null> {
  // 1. Get the share record and verify access
  const shareResult = await query<RecipeShareRow & { owner_name: string }>(
    `SELECT rs.*, u.name as owner_name
     FROM recipe_shares rs
     JOIN users u ON u.id = rs.owner_user_id
     WHERE rs.recipe_id = $1 AND rs.shared_with_user_id = $2`,
    [recipeId, userId]
  );

  if (shareResult.rows.length === 0) {
    return null;
  }

  const shareRow = shareResult.rows[0];

  // 2. Get the active recipe version
  const recipeResult = await query<RecipeRow>(
    `SELECT * FROM recipes
     WHERE id = $1 AND is_active = true`,
    [recipeId]
  );

  if (recipeResult.rows.length === 0) {
    return null; // Recipe was deleted
  }

  const recipe = rowToRecipe(recipeResult.rows[0]);

  // 3. Get version history
  const versionsResult = await query<{
    version: number;
    title: string;
    description: string | null;
    created_at: Date;
    is_active: boolean;
  }>(
    `SELECT version, title, description, created_at, is_active
     FROM recipes
     WHERE id = $1
     ORDER BY version DESC`,
    [recipeId]
  );

  const versionHistory: RecipeVersion[] = versionsResult.rows.map((row) => ({
    version: row.version,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    isActive: row.is_active,
  }));

  // 4. Check if already forked
  const forkResult = await query<{ forked_recipe_id: number }>(
    `SELECT rf.forked_recipe_id
     FROM recipe_forks rf
     JOIN recipes r ON r.id = rf.forked_recipe_id AND r.is_active = true
     WHERE rf.original_recipe_id = $1 AND rf.forked_by_user_id = $2`,
    [recipeId, userId]
  );

  let forkedRecipeSlug: string | undefined;
  if (forkResult.rows.length > 0) {
    const slugResult = await query<{ slug: string }>(
      `SELECT slug FROM recipes WHERE id = $1`,
      [forkResult.rows[0].forked_recipe_id]
    );
    forkedRecipeSlug = slugResult.rows[0]?.slug;
  }

  return {
    shareId: shareRow.id,
    recipeId: shareRow.recipe_id,
    recipe,
    owner: {
      id: shareRow.owner_user_id,
      name: shareRow.owner_name,
    },
    permission: shareRow.permission,
    sharedAt: shareRow.created_at,
    versionHistory,
    forkInfo: {
      canFork: true,
      alreadyForked: forkResult.rows.length > 0,
      forkedRecipeSlug,
    },
  };
}

// ============================================
// Fork Operations
// ============================================

/**
 * Fork a shared recipe (create own independent copy)
 */
export async function forkRecipe(
  userId: number,
  recipeId: number
): Promise<{ forkedRecipeId: number; forkedSlug: string }> {
  return transaction(async (client) => {
    // 1. Verify user has access to this recipe (via share)
    const shareResult = await client.query<{ id: number }>(
      `SELECT id FROM recipe_shares
       WHERE recipe_id = $1 AND shared_with_user_id = $2`,
      [recipeId, userId]
    );

    if (shareResult.rows.length === 0) {
      throw new Error("Recipe not shared with you");
    }

    // 2. Check if already forked
    const existingFork = await client.query<{ forked_recipe_id: number }>(
      `SELECT forked_recipe_id FROM recipe_forks
       WHERE original_recipe_id = $1 AND forked_by_user_id = $2`,
      [recipeId, userId]
    );

    if (existingFork.rows.length > 0) {
      throw new Error("You have already forked this recipe");
    }

    // 3. Get the original recipe
    const recipeResult = await client.query<RecipeRow>(
      `SELECT * FROM recipes
       WHERE id = $1 AND is_active = true`,
      [recipeId]
    );

    if (recipeResult.rows.length === 0) {
      throw new Error("Original recipe not found");
    }

    const original = recipeResult.rows[0];

    // 4. Generate unique slug for the forked recipe
    const baseSlug = generateSlug(original.title);
    let slug = baseSlug;
    let counter = 2;

    while (true) {
      const existing = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM recipes WHERE user_id = $1 AND slug = $2`,
        [userId, slug]
      );
      if (parseInt(existing.rows[0].count, 10) === 0) {
        break;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 5. Create the forked recipe
    const forkedRecipeResult = await client.query<{ id: number }>(
      `INSERT INTO recipes
         (user_id, slug, version, title, description, locale, tags, recipe_json)
       VALUES ($1, $2, 1, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        slug,
        original.title,
        original.description,
        original.locale,
        JSON.stringify(original.tags),
        JSON.stringify(original.recipe_json),
      ]
    );

    const forkedRecipeId = forkedRecipeResult.rows[0].id;

    // 6. Record the fork
    await client.query(
      `INSERT INTO recipe_forks
         (original_recipe_id, original_owner_id, forked_recipe_id, forked_by_user_id, forked_at_version)
       VALUES ($1, $2, $3, $4, $5)`,
      [recipeId, original.user_id, forkedRecipeId, userId, original.version]
    );

    return { forkedRecipeId, forkedSlug: slug };
  });
}

/**
 * Check if a recipe has access from a specific user
 * Used for permission checks in API routes
 */
export async function hasRecipeAccess(
  userId: number,
  recipeId: number
): Promise<{
  hasAccess: boolean;
  permission: SharePermission | null;
  isOwner: boolean;
}> {
  // Check if owner
  const ownerResult = await query<{ id: number }>(
    `SELECT id FROM recipes WHERE id = $1 AND user_id = $2 AND is_active = true`,
    [recipeId, userId]
  );

  if (ownerResult.rows.length > 0) {
    return { hasAccess: true, permission: "admin", isOwner: true };
  }

  // Check if shared
  const shareResult = await query<{ permission: SharePermission }>(
    `SELECT permission FROM recipe_shares
     WHERE recipe_id = $1 AND shared_with_user_id = $2`,
    [recipeId, userId]
  );

  if (shareResult.rows.length > 0) {
    return {
      hasAccess: true,
      permission: shareResult.rows[0].permission,
      isOwner: false,
    };
  }

  return { hasAccess: false, permission: null, isOwner: false };
}
