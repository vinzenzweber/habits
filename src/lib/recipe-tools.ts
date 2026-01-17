/**
 * Recipe tools for AI chat integration
 * Follows the workout-tools.ts pattern
 */

import { query, transaction } from "./db";
import {
  Recipe,
  RecipeRow,
  CreateRecipeInput,
  UpdateRecipeInput,
  rowToRecipe,
  isValidRecipeJson,
} from "./recipe-types";
import { getUniqueSlug } from "./recipes";

// ============================================
// Tool Response Types
// ============================================

export interface RecipeToolSummary {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  nutrition: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber?: number;
  };
}

export interface CreateRecipeResult {
  success: boolean;
  recipe: Recipe;
  message: string;
}

export interface UpdateRecipeResult {
  success: boolean;
  version: number;
  message: string;
}

// ============================================
// Tool Implementations
// ============================================

/**
 * Search user's recipes by text query or tags
 * Returns lightweight summaries suitable for list display
 */
export async function searchRecipesTool(
  userId: string,
  searchQuery?: string,
  tags?: string[],
  limit: number = 10
): Promise<RecipeToolSummary[]> {
  const userIdNum = parseInt(userId, 10);

  let sql: string;
  const params: (number | string | string[])[] = [userIdNum];

  if (searchQuery && tags && tags.length > 0) {
    // Both text search and tag filter
    sql = `
      SELECT slug, title, description, tags,
             (recipe_json->>'servings')::int as servings,
             (recipe_json->>'prepTimeMinutes')::int as prep_time_minutes,
             (recipe_json->>'cookTimeMinutes')::int as cook_time_minutes,
             recipe_json->'nutrition' as nutrition,
             recipe_json->>'description' as recipe_description
      FROM recipes
      WHERE user_id = $1 AND is_active = true
        AND to_tsvector('german', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('german', $2)
        AND tags ?| $3
      ORDER BY updated_at DESC
      LIMIT $4
    `;
    params.push(searchQuery, tags, limit);
  } else if (searchQuery) {
    // Text search only
    sql = `
      SELECT slug, title, description, tags,
             (recipe_json->>'servings')::int as servings,
             (recipe_json->>'prepTimeMinutes')::int as prep_time_minutes,
             (recipe_json->>'cookTimeMinutes')::int as cook_time_minutes,
             recipe_json->'nutrition' as nutrition,
             recipe_json->>'description' as recipe_description
      FROM recipes
      WHERE user_id = $1 AND is_active = true
        AND to_tsvector('german', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('german', $2)
      ORDER BY updated_at DESC
      LIMIT $3
    `;
    params.push(searchQuery, limit);
  } else if (tags && tags.length > 0) {
    // Tag filter only
    sql = `
      SELECT slug, title, description, tags,
             (recipe_json->>'servings')::int as servings,
             (recipe_json->>'prepTimeMinutes')::int as prep_time_minutes,
             (recipe_json->>'cookTimeMinutes')::int as cook_time_minutes,
             recipe_json->'nutrition' as nutrition,
             recipe_json->>'description' as recipe_description
      FROM recipes
      WHERE user_id = $1 AND is_active = true
        AND tags ?| $2
      ORDER BY updated_at DESC
      LIMIT $3
    `;
    params.push(tags, limit);
  } else {
    // No filters - return all
    sql = `
      SELECT slug, title, description, tags,
             (recipe_json->>'servings')::int as servings,
             (recipe_json->>'prepTimeMinutes')::int as prep_time_minutes,
             (recipe_json->>'cookTimeMinutes')::int as cook_time_minutes,
             recipe_json->'nutrition' as nutrition,
             recipe_json->>'description' as recipe_description
      FROM recipes
      WHERE user_id = $1 AND is_active = true
      ORDER BY updated_at DESC
      LIMIT $2
    `;
    params.push(limit);
  }

  interface SummaryRow {
    slug: string;
    title: string;
    description: string | null;
    tags: string[];
    servings: number;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    nutrition: {
      calories: number;
      protein: number;
      carbohydrates: number;
      fat: number;
      fiber?: number;
    };
    recipe_description: string;
  }

  const result = await query<SummaryRow>(sql, params);

  return result.rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    description: row.description ?? row.recipe_description,
    tags: row.tags,
    servings: row.servings,
    prepTimeMinutes: row.prep_time_minutes ?? undefined,
    cookTimeMinutes: row.cook_time_minutes ?? undefined,
    nutrition: row.nutrition,
  }));
}

/**
 * Get full recipe details by slug
 */
export async function getRecipeTool(
  userId: string,
  slug: string
): Promise<Recipe | null> {
  const userIdNum = parseInt(userId, 10);

  const result = await query<RecipeRow>(
    `SELECT * FROM recipes
     WHERE user_id = $1 AND slug = $2 AND is_active = true
     ORDER BY version DESC LIMIT 1`,
    [userIdNum, slug]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return rowToRecipe(result.rows[0]);
}

/**
 * Create a new recipe
 * Validates input and creates with versioning
 *
 * @param userId - The user ID
 * @param input - Recipe creation input
 * @param defaultLocale - Default locale to use if not specified in input (defaults to 'en-US')
 */
export async function createRecipeTool(
  userId: string,
  input: CreateRecipeInput,
  defaultLocale: string = 'en-US'
): Promise<CreateRecipeResult> {
  const userIdNum = parseInt(userId, 10);

  // Validate recipeJson structure
  if (!isValidRecipeJson(input.recipeJson)) {
    throw new Error("Invalid recipe structure. Please check all required fields.");
  }

  const recipe = await transaction(async (client) => {
    const slug = await getUniqueSlug(userIdNum, input.title);

    // Check if slug exists, increment version if so
    const existingResult = await client.query<{ version: number }>(
      `SELECT MAX(version) as version FROM recipes WHERE user_id = $1 AND slug = $2`,
      [userIdNum, slug]
    );
    const version = (existingResult.rows[0]?.version || 0) + 1;

    // Deactivate previous versions
    await client.query(
      `UPDATE recipes SET is_active = false WHERE user_id = $1 AND slug = $2`,
      [userIdNum, slug]
    );

    // Create new recipe
    const result = await client.query<RecipeRow>(
      `INSERT INTO recipes (
        user_id, slug, version, title, description, locale, tags, recipe_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userIdNum,
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

  return {
    success: true,
    recipe,
    message: `Recipe "${recipe.title}" created successfully`,
  };
}

/**
 * Update an existing recipe (creates new version)
 */
export async function updateRecipeTool(
  userId: string,
  slug: string,
  input: UpdateRecipeInput
): Promise<UpdateRecipeResult> {
  const userIdNum = parseInt(userId, 10);

  // Validate recipeJson if provided
  if (input.recipeJson && !isValidRecipeJson(input.recipeJson)) {
    throw new Error("Invalid recipe structure. Please check all required fields.");
  }

  const recipe = await transaction(async (client) => {
    // Get current recipe
    const currentResult = await client.query<RecipeRow>(
      `SELECT * FROM recipes
       WHERE user_id = $1 AND slug = $2 AND is_active = true
       ORDER BY version DESC LIMIT 1`,
      [userIdNum, slug]
    );

    if (currentResult.rows.length === 0) {
      throw new Error("Recipe not found");
    }

    const current = currentResult.rows[0];
    const newVersion = current.version + 1;

    // Deactivate current version
    await client.query(
      `UPDATE recipes SET is_active = false WHERE id = $1`,
      [current.id]
    );

    // Create new version
    const result = await client.query<RecipeRow>(
      `INSERT INTO recipes (
        user_id, slug, version, title, description, locale, tags, recipe_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userIdNum,
        slug,
        newVersion,
        input.title ?? current.title,
        input.description !== undefined ? input.description : current.description,
        input.locale ?? current.locale,
        JSON.stringify(input.tags ?? current.tags),
        JSON.stringify(input.recipeJson ?? current.recipe_json),
      ]
    );

    return rowToRecipe(result.rows[0]);
  });

  return {
    success: true,
    version: recipe.version,
    message: `Recipe "${recipe.title}" updated to version ${recipe.version}`,
  };
}
