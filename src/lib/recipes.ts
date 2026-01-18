/**
 * Recipe data access layer
 * Follows workout pattern with versioning and user scoping
 */

import { query, transaction } from "./db";
import { auth } from "./auth";
import {
  Recipe,
  RecipeRow,
  RecipeSummary,
  RecipeVersion,
  CreateRecipeInput,
  UpdateRecipeInput,
  rowToRecipe,
  generateSlug,
} from "./recipe-types";

// Re-export generateSlug for backwards compatibility
export { generateSlug };

/**
 * Check if a slug exists for a user
 */
export async function slugExists(userId: number, slug: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM recipes WHERE user_id = $1 AND slug = $2`,
    [userId, slug]
  );
  return parseInt(result.rows[0].count, 10) > 0;
}

/**
 * Get a unique slug for a recipe, appending numbers if needed
 */
export async function getUniqueSlug(
  userId: number,
  title: string
): Promise<string> {
  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 2;

  while (await slugExists(userId, slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Get all active recipes for the current user
 */
export async function getUserRecipes(): Promise<Recipe[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  const result = await query<RecipeRow>(
    `SELECT * FROM recipes
     WHERE user_id = $1 AND is_active = true
     ORDER BY updated_at DESC`,
    [userId]
  );

  return result.rows.map(rowToRecipe);
}

/**
 * Get a single recipe by slug
 */
export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  const result = await query<RecipeRow>(
    `SELECT * FROM recipes
     WHERE user_id = $1 AND slug = $2 AND is_active = true
     ORDER BY version DESC LIMIT 1`,
    [userId, slug]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return rowToRecipe(result.rows[0]);
}

/**
 * Search recipes by tags
 */
export async function getRecipesByTags(tags: string[]): Promise<Recipe[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  const result = await query<RecipeRow>(
    `SELECT * FROM recipes
     WHERE user_id = $1 AND is_active = true AND tags ?| $2
     ORDER BY updated_at DESC`,
    [userId, tags]
  );

  return result.rows.map(rowToRecipe);
}

/**
 * Full-text search recipes
 */
export async function searchRecipes(searchTerm: string): Promise<Recipe[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  const result = await query<RecipeRow>(
    `SELECT * FROM recipes
     WHERE user_id = $1 AND is_active = true
     AND to_tsvector('german', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('german', $2)
     ORDER BY updated_at DESC`,
    [userId, searchTerm]
  );

  return result.rows.map(rowToRecipe);
}

/**
 * Create a new recipe
 */
export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);
  // Use user's locale preference as fallback, with 'en-US' as ultimate default
  const defaultLocale = session.user.locale ?? 'en-US';

  return transaction(async (client) => {
    const slug = await getUniqueSlug(userId, input.title);

    // Check if slug exists, increment version if so
    const existingResult = await client.query<{ version: number }>(
      `SELECT MAX(version) as version FROM recipes WHERE user_id = $1 AND slug = $2`,
      [userId, slug]
    );
    const version = (existingResult.rows[0]?.version || 0) + 1;

    // Deactivate previous versions
    await client.query(
      `UPDATE recipes SET is_active = false WHERE user_id = $1 AND slug = $2`,
      [userId, slug]
    );

    // Create new recipe
    const result = await client.query<RecipeRow>(
      `INSERT INTO recipes (
        user_id, slug, version, title, description, locale, tags, recipe_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        slug,
        version,
        input.title,
        input.description || null,
        input.locale || defaultLocale,
        JSON.stringify(input.tags || []),
        JSON.stringify(input.recipeJson),
      ]
    );

    return rowToRecipe(result.rows[0]);
  });
}

/**
 * Update an existing recipe (creates new version)
 */
export async function updateRecipe(
  slug: string,
  input: UpdateRecipeInput
): Promise<Recipe> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  return transaction(async (client) => {
    // Get current recipe
    const currentResult = await client.query<RecipeRow>(
      `SELECT * FROM recipes
       WHERE user_id = $1 AND slug = $2 AND is_active = true
       ORDER BY version DESC LIMIT 1`,
      [userId, slug]
    );

    if (currentResult.rows.length === 0) {
      throw new Error("Recipe not found");
    }

    const current = currentResult.rows[0];
    const newVersion = current.version + 1;

    // Deactivate current version
    await client.query(`UPDATE recipes SET is_active = false WHERE id = $1`, [
      current.id,
    ]);

    // Create new version
    const result = await client.query<RecipeRow>(
      `INSERT INTO recipes (
        user_id, slug, version, title, description, locale, tags, recipe_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        slug,
        newVersion,
        input.title ?? current.title,
        input.description !== undefined
          ? input.description
          : current.description,
        input.locale ?? current.locale,
        JSON.stringify(input.tags ?? current.tags),
        JSON.stringify(input.recipeJson ?? current.recipe_json),
      ]
    );

    return rowToRecipe(result.rows[0]);
  });
}

/**
 * Delete a recipe (soft delete)
 */
export async function deleteRecipe(slug: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  await query(
    `UPDATE recipes SET is_active = false WHERE user_id = $1 AND slug = $2`,
    [userId, slug]
  );
}

/**
 * Get all unique tags used by the current user
 */
export async function getUserTags(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  const result = await query<{ tag: string }>(
    `SELECT DISTINCT jsonb_array_elements_text(tags) as tag
     FROM recipes
     WHERE user_id = $1 AND is_active = true
     ORDER BY tag`,
    [userId]
  );

  return result.rows.map((row) => row.tag);
}

/**
 * Get all active recipes for the current user as summaries (lightweight)
 * Queries only the fields needed for RecipeSummary instead of full recipe data
 */
export async function getUserRecipeSummaries(): Promise<RecipeSummary[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  // Query only the columns needed for RecipeSummary
  // Uses JSON extraction to avoid loading full recipe_json (which contains steps, ingredientGroups, etc.)
  // Includes LEFT JOIN to aggregate ratings from recipe_ratings table
  // Includes LEFT JOIN to recipe_favorites for favorite status
  const result = await query<{
    slug: string;
    title: string;
    description: string | null;
    tags: string[];
    servings: number;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    images: Array<{ url: string; caption?: string; isPrimary?: boolean }>;
    nutrition: {
      calories: number;
      protein: number;
      carbohydrates: number;
      fat: number;
      fiber?: number;
    };
    recipe_description: string;
    is_favorite: boolean;
    rating: number | null;
    updated_at: Date;
    avg_rating: number | null;
    rating_count: number;
  }>(
    `SELECT r.slug, r.title, r.description, r.tags,
            (r.recipe_json->>'servings')::int as servings,
            (r.recipe_json->>'prepTimeMinutes')::int as prep_time_minutes,
            (r.recipe_json->>'cookTimeMinutes')::int as cook_time_minutes,
            r.recipe_json->'images' as images,
            r.recipe_json->'nutrition' as nutrition,
            r.recipe_json->>'description' as recipe_description,
            (rf.id IS NOT NULL) as is_favorite,
            (r.recipe_json->>'rating')::float as rating,
            r.updated_at,
            COALESCE(ratings.avg_rating, 0) as avg_rating,
            COALESCE(ratings.rating_count, 0) as rating_count
     FROM recipes r
     LEFT JOIN recipe_favorites rf ON rf.recipe_id = r.id AND rf.user_id = $1
     LEFT JOIN (
       SELECT recipe_id, recipe_version,
              AVG(rating)::float as avg_rating,
              COUNT(*)::int as rating_count
       FROM recipe_ratings
       GROUP BY recipe_id, recipe_version
     ) ratings ON ratings.recipe_id = r.id AND ratings.recipe_version = r.version
     WHERE r.user_id = $1 AND r.is_active = true
     ORDER BY r.updated_at DESC`,
    [userId]
  );

  return result.rows.map((row) => {
    // Get the primary image or first image
    const images = row.images || [];
    const primaryImage = images.find((img) => img.isPrimary) ?? images[0];

    return {
      slug: row.slug,
      title: row.title,
      description: row.description ?? row.recipe_description,
      tags: row.tags,
      servings: row.servings,
      prepTimeMinutes: row.prep_time_minutes ?? undefined,
      cookTimeMinutes: row.cook_time_minutes ?? undefined,
      primaryImage,
      nutrition: row.nutrition,
      isFavorite: row.is_favorite,
      rating: row.rating ?? undefined,
      updatedAt: row.updated_at,
      averageRating:
        row.avg_rating && row.avg_rating > 0
          ? Math.round(row.avg_rating * 10) / 10
          : undefined,
      ratingCount: row.rating_count > 0 ? row.rating_count : undefined,
    };
  });
}

/**
 * Update a recipe in place without creating a new version
 * Use for minor metadata changes (favorite status, notes, etc.)
 */
export async function updateRecipeInPlace(
  slug: string,
  input: UpdateRecipeInput
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  // Build dynamic UPDATE query based on provided fields
  const updates: string[] = [];
  const values: unknown[] = [userId, slug];
  let paramIndex = 3;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.locale !== undefined) {
    updates.push(`locale = $${paramIndex++}`);
    values.push(input.locale);
  }
  if (input.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    values.push(JSON.stringify(input.tags));
  }
  if (input.recipeJson !== undefined) {
    updates.push(`recipe_json = $${paramIndex++}`);
    values.push(JSON.stringify(input.recipeJson));
  }

  if (updates.length === 0) {
    return { success: true }; // Nothing to update
  }

  updates.push("updated_at = NOW()");

  const result = await query(
    `UPDATE recipes
     SET ${updates.join(", ")}
     WHERE user_id = $1 AND slug = $2 AND is_active = true`,
    values
  );

  if (result.rowCount === 0) {
    throw new Error("Recipe not found or inactive");
  }

  return { success: true };
}

/**
 * Save a new version of a recipe (creates new version row)
 *
 * This is a convenience wrapper around updateRecipe() that returns only the
 * new version number. Use this when you only need to confirm the version was
 * created and don't need the full Recipe object.
 *
 * Use updateRecipe() directly when you need:
 * - The full Recipe object after update
 * - Access to recipeJson, timestamps, or other fields
 *
 * Use saveRecipeVersion() when you only need:
 * - Confirmation that a new version was saved
 * - The new version number for display or logging
 */
export async function saveRecipeVersion(
  slug: string,
  input: UpdateRecipeInput
): Promise<{ version: number }> {
  const recipe = await updateRecipe(slug, input);
  return { version: recipe.version };
}

/**
 * Get version history for a recipe
 * Returns all versions (active and inactive) ordered by version DESC
 *
 * @param slug - The recipe slug
 * @param options.limit - Maximum number of versions to return (default: all)
 * @param options.offset - Number of versions to skip (default: 0)
 */
export async function getRecipeVersions(
  slug: string,
  options?: { limit?: number; offset?: number }
): Promise<RecipeVersion[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  // Build query with optional pagination
  let queryText = `SELECT version, title, description, created_at, is_active
     FROM recipes
     WHERE user_id = $1 AND slug = $2
     ORDER BY version DESC`;
  const values: (number | string)[] = [userId, slug];

  if (options?.limit !== undefined) {
    queryText += ` LIMIT $${values.length + 1}`;
    values.push(options.limit);
  }

  if (options?.offset !== undefined) {
    queryText += ` OFFSET $${values.length + 1}`;
    values.push(options.offset);
  }

  const result = await query<{
    version: number;
    title: string;
    description: string | null;
    created_at: Date;
    is_active: boolean;
  }>(queryText, values);

  return result.rows.map((row) => ({
    version: row.version,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    isActive: row.is_active,
  }));
}

// ============================================
// Shared Recipe Access Functions
// ============================================

/**
 * Get a recipe by ID (for shared recipe access)
 * This bypasses user scoping - use only with proper access checks
 */
export async function getRecipeById(recipeId: number): Promise<Recipe | null> {
  const result = await query<RecipeRow>(
    `SELECT * FROM recipes
     WHERE id = $1 AND is_active = true`,
    [recipeId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return rowToRecipe(result.rows[0]);
}

/**
 * Get version history for a recipe by ID (for shared recipe access)
 * This bypasses user scoping - use only with proper access checks
 */
export async function getRecipeVersionsById(
  recipeId: number,
  options?: { limit?: number; offset?: number }
): Promise<RecipeVersion[]> {
  let queryText = `SELECT version, title, description, created_at, is_active
     FROM recipes
     WHERE id = $1
     ORDER BY version DESC`;
  const values: (number | string)[] = [recipeId];

  if (options?.limit !== undefined) {
    queryText += ` LIMIT $${values.length + 1}`;
    values.push(options.limit);
  }

  if (options?.offset !== undefined) {
    queryText += ` OFFSET $${values.length + 1}`;
    values.push(options.offset);
  }

  const result = await query<{
    version: number;
    title: string;
    description: string | null;
    created_at: Date;
    is_active: boolean;
  }>(queryText, values);

  return result.rows.map((row) => ({
    version: row.version,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    isActive: row.is_active,
  }));
}
