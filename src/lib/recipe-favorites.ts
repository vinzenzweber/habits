/**
 * Recipe favorites data access layer
 * Handles user favorites for quick recipe access
 */

import { query } from "./db";
import { auth } from "./auth";

interface RecipeFavoriteRow {
  id: number;
  user_id: number;
  recipe_id: number;
  created_at: Date;
}

/**
 * Check if a recipe is favorited by the current user
 */
export async function isRecipeFavorite(recipeId: number): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM recipe_favorites WHERE user_id = $1 AND recipe_id = $2
    ) as exists`,
    [userId, recipeId]
  );

  return result.rows[0]?.exists ?? false;
}

/**
 * Add a recipe to the current user's favorites
 */
export async function addFavorite(recipeId: number): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  await query<RecipeFavoriteRow>(
    `INSERT INTO recipe_favorites (user_id, recipe_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, recipe_id) DO NOTHING`,
    [userId, recipeId]
  );
}

/**
 * Remove a recipe from the current user's favorites
 */
export async function removeFavorite(recipeId: number): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  await query(
    `DELETE FROM recipe_favorites WHERE user_id = $1 AND recipe_id = $2`,
    [userId, recipeId]
  );
}

/**
 * Get all favorited recipe IDs for the current user
 */
export async function getUserFavoriteRecipeIds(): Promise<number[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  const result = await query<{ recipe_id: number }>(
    `SELECT recipe_id FROM recipe_favorites WHERE user_id = $1`,
    [userId]
  );

  return result.rows.map((row) => row.recipe_id);
}

/**
 * Get favorite status for a recipe by slug (for API use)
 * Returns recipe_id and favorite status
 */
export async function getFavoriteStatusBySlug(
  slug: string
): Promise<{ recipeId: number; isFavorite: boolean } | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  const result = await query<{ id: number; is_favorite: boolean }>(
    `SELECT r.id,
            EXISTS(
              SELECT 1 FROM recipe_favorites rf
              WHERE rf.user_id = $1 AND rf.recipe_id = r.id
            ) as is_favorite
     FROM recipes r
     WHERE r.user_id = $1 AND r.slug = $2 AND r.is_active = true`,
    [userId, slug]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    recipeId: result.rows[0].id,
    isFavorite: result.rows[0].is_favorite,
  };
}
