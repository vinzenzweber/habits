/**
 * Recipe ratings data access layer
 * Handles multi-user, version-aware ratings
 */

import { query } from "./db";
import { auth } from "./auth";
import {
  RecipeRating,
  RecipeRatingRow,
  VersionRatingStats,
  RatingHistory,
  CreateRatingInput,
} from "./recipe-types";

/**
 * Add or update a rating for a specific recipe version
 */
export async function upsertRating(
  recipeId: number,
  version: number,
  input: CreateRatingInput
): Promise<RecipeRating> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  // Upsert: insert or update on conflict
  const result = await query<RecipeRatingRow & { name: string }>(
    `INSERT INTO recipe_ratings (user_id, recipe_id, recipe_version, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, recipe_id, recipe_version)
     DO UPDATE SET rating = $4, comment = $5, updated_at = NOW()
     RETURNING recipe_ratings.*,
       (SELECT name FROM users WHERE id = $1) as name`,
    [userId, recipeId, version, input.rating, input.comment || null]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.name,
    recipeId: row.recipe_id,
    recipeVersion: row.recipe_version,
    rating: row.rating,
    comment: row.comment ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get the current user's rating for a specific version
 */
export async function getUserRatingForVersion(
  recipeId: number,
  version: number
): Promise<RecipeRating | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  const result = await query<RecipeRatingRow & { name: string }>(
    `SELECT rr.*, u.name
     FROM recipe_ratings rr
     JOIN users u ON u.id = rr.user_id
     WHERE rr.user_id = $1 AND rr.recipe_id = $2 AND rr.recipe_version = $3`,
    [userId, recipeId, version]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.name,
    recipeId: row.recipe_id,
    recipeVersion: row.recipe_version,
    rating: row.rating,
    comment: row.comment ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all ratings for a specific version with aggregate stats
 */
export async function getVersionRatings(
  recipeId: number,
  version: number
): Promise<VersionRatingStats> {
  const result = await query<RecipeRatingRow & { name: string }>(
    `SELECT rr.*, u.name
     FROM recipe_ratings rr
     JOIN users u ON u.id = rr.user_id
     WHERE rr.recipe_id = $1 AND rr.recipe_version = $2
     ORDER BY rr.created_at DESC`,
    [recipeId, version]
  );

  const ratings = result.rows.map((row) => ({
    userId: row.user_id,
    userName: row.name,
    rating: row.rating,
    comment: row.comment ?? undefined,
    createdAt: row.created_at.toISOString(),
  }));

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

  return {
    version,
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    ratingCount: ratings.length,
    ratings,
  };
}

/**
 * Get rating history across all versions of a recipe
 */
export async function getRatingHistory(
  recipeId: number
): Promise<RatingHistory> {
  // Get all versions that have ratings
  const versionsResult = await query<{ recipe_version: number }>(
    `SELECT DISTINCT recipe_version
     FROM recipe_ratings
     WHERE recipe_id = $1
     ORDER BY recipe_version DESC`,
    [recipeId]
  );

  // Get ratings for each version
  const history: RatingHistory = [];
  for (const { recipe_version } of versionsResult.rows) {
    const versionStats = await getVersionRatings(recipeId, recipe_version);
    history.push(versionStats);
  }

  return history;
}

/**
 * Get average rating for a recipe's current version (for list views)
 * Returns null if no ratings exist
 */
export async function getCurrentVersionAverageRating(
  recipeId: number,
  currentVersion: number
): Promise<{ averageRating: number; ratingCount: number } | null> {
  const result = await query<{ avg: string | null; count: string }>(
    `SELECT AVG(rating)::float as avg, COUNT(*)::int as count
     FROM recipe_ratings
     WHERE recipe_id = $1 AND recipe_version = $2`,
    [recipeId, currentVersion]
  );

  const { avg, count } = result.rows[0];
  if (!avg || parseInt(count) === 0) return null;

  return {
    averageRating: Math.round(parseFloat(avg) * 10) / 10,
    ratingCount: parseInt(count),
  };
}

/**
 * Delete a user's rating for a specific version
 */
export async function deleteRating(
  recipeId: number,
  version: number
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = parseInt(session.user.id, 10);

  await query(
    `DELETE FROM recipe_ratings
     WHERE user_id = $1 AND recipe_id = $2 AND recipe_version = $3`,
    [userId, recipeId, version]
  );
}
