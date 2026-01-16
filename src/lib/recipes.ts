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
  toRecipeSummary,
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
        input.locale || "de-DE",
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
 */
export async function getUserRecipeSummaries(): Promise<RecipeSummary[]> {
  const recipes = await getUserRecipes();
  return recipes.map(toRecipeSummary);
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
    throw new Error("Recipe not found");
  }

  return { success: true };
}

/**
 * Save a new version of a recipe (creates new version row)
 * Alias for updateRecipe with different return type
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
 */
export async function getRecipeVersions(slug: string): Promise<RecipeVersion[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  const result = await query<{
    version: number;
    title: string;
    description: string | null;
    created_at: Date;
    is_active: boolean;
  }>(
    `SELECT version, title, description, created_at, is_active
     FROM recipes
     WHERE user_id = $1 AND slug = $2
     ORDER BY version DESC`,
    [userId, slug]
  );

  return result.rows.map((row) => ({
    version: row.version,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    isActive: row.is_active,
  }));
}
