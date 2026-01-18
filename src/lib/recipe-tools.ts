/**
 * Recipe tools for AI chat integration
 * Follows the workout-tools.ts pattern
 */

import OpenAI from "openai";
import { query, transaction } from "./db";
import {
  Recipe,
  RecipeJson,
  RecipeRow,
  CreateRecipeInput,
  UpdateRecipeInput,
  rowToRecipe,
  isValidRecipeJson,
  generateSlug,
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

// ============================================
// Translation Tool Types and Constants
// ============================================

export const SUPPORTED_TRANSLATION_LOCALES = [
  'de-DE', 'en-US', 'en-GB', 'es-ES', 'fr-FR', 'it-IT'
] as const;

export type TranslationLocale = typeof SUPPORTED_TRANSLATION_LOCALES[number];

export interface TranslateRecipeResult {
  success: boolean;
  translatedRecipe: RecipeJson;
  savedAsNewVersion?: boolean;
  newVersion?: number;
  message: string;
}

// Measurement system configuration per locale
const LOCALE_MEASUREMENT_SYSTEMS: Record<TranslationLocale, { system: 'metric' | 'imperial'; tempUnit: '°C' | '°F' }> = {
  'de-DE': { system: 'metric', tempUnit: '°C' },
  'en-US': { system: 'imperial', tempUnit: '°F' },
  'en-GB': { system: 'metric', tempUnit: '°C' },
  'es-ES': { system: 'metric', tempUnit: '°C' },
  'fr-FR': { system: 'metric', tempUnit: '°C' },
  'it-IT': { system: 'metric', tempUnit: '°C' },
};

// Human-readable locale names for prompts
const LOCALE_NAMES: Record<TranslationLocale, string> = {
  'de-DE': 'German (Germany)',
  'en-US': 'English (United States)',
  'en-GB': 'English (United Kingdom)',
  'es-ES': 'Spanish (Spain)',
  'fr-FR': 'French (France)',
  'it-IT': 'Italian (Italy)',
};

// ============================================
// Translation Tool Implementation
// ============================================

/**
 * Translate a recipe to a different language and optionally adapt measurements.
 * Uses GPT to perform intelligent translation including locale-appropriate ingredient names.
 */
export async function translateRecipeTool(
  openai: OpenAI,
  userId: string,
  recipeId: number,
  targetLocale: TranslationLocale,
  adaptMeasurements: boolean = true,
  saveAsNew: boolean = false
): Promise<TranslateRecipeResult> {
  const userIdNum = parseInt(userId, 10);

  // Validate target locale
  if (!SUPPORTED_TRANSLATION_LOCALES.includes(targetLocale)) {
    throw new Error(`Unsupported locale: ${targetLocale}. Supported locales: ${SUPPORTED_TRANSLATION_LOCALES.join(', ')}`);
  }

  // Fetch the recipe by ID
  const recipeResult = await query<RecipeRow>(
    `SELECT * FROM recipes
     WHERE id = $1 AND user_id = $2 AND is_active = true`,
    [recipeId, userIdNum]
  );

  if (recipeResult.rows.length === 0) {
    throw new Error("Recipe not found");
  }

  const recipe = rowToRecipe(recipeResult.rows[0]);
  const sourceRecipeJson = recipe.recipeJson;
  const sourceLocale = sourceRecipeJson.locale || recipe.locale || 'en-US';

  // Don't translate if already in target locale
  if (sourceLocale === targetLocale) {
    throw new Error(`Recipe is already in ${LOCALE_NAMES[targetLocale as TranslationLocale] || targetLocale}`);
  }

  // Determine measurement systems
  const sourceSystem = LOCALE_MEASUREMENT_SYSTEMS[sourceLocale as TranslationLocale] || { system: 'metric', tempUnit: '°C' };
  const targetSystem = LOCALE_MEASUREMENT_SYSTEMS[targetLocale];

  // Build the measurement conversion instructions
  let measurementInstructions = '';
  if (adaptMeasurements && sourceSystem.system !== targetSystem.system) {
    if (targetSystem.system === 'metric') {
      measurementInstructions = `
Convert measurements from imperial to metric:
- cups → ml (1 cup = 240ml)
- oz (weight) → g (1 oz = 28g)
- lbs → kg (1 lb = 454g)
- fl oz → ml (1 fl oz = 30ml)
- tbsp → ml (1 tbsp = 15ml)
- tsp → ml (1 tsp = 5ml)
- °F → °C (formula: (°F - 32) × 5/9)

Use round, practical numbers (e.g., 250ml instead of 236.6ml).`;
    } else {
      measurementInstructions = `
Convert measurements from metric to imperial:
- ml → cups/fl oz (240ml = 1 cup, 30ml = 1 fl oz)
- g → oz (28g = 1 oz)
- kg → lbs (454g = 1 lb)
- ml → tbsp/tsp (15ml = 1 tbsp, 5ml = 1 tsp)
- °C → °F (formula: °C × 9/5 + 32)

Use round, practical numbers (e.g., 1/2 cup instead of 0.42 cups).`;
    }
  } else if (!adaptMeasurements) {
    measurementInstructions = 'Keep all measurements exactly as they are in the source recipe.';
  } else {
    measurementInstructions = 'Measurements are already in the correct system. Keep them as-is but translate unit names if needed.';
  }

  // Build the GPT prompt
  const prompt = `You are a professional recipe translator. Translate this recipe from ${LOCALE_NAMES[sourceLocale as TranslationLocale] || sourceLocale} to ${LOCALE_NAMES[targetLocale]}.

**Translation Requirements:**
1. Translate ALL text content:
   - title
   - description
   - ingredient group names
   - ingredient names (use locale-appropriate names, e.g., "cilantro" in en-US → "coriander" in en-GB)
   - step instructions
   - image captions (if present)

2. Use natural, fluent language appropriate for ${LOCALE_NAMES[targetLocale]}.

3. Measurement handling:
${measurementInstructions}

4. Update the slug to be URL-friendly in the target language.

5. Update the locale field to "${targetLocale}".

6. Preserve the exact JSON structure - only change text values and numbers for conversions.

7. Do NOT modify: nutrition values, servings count, times, or image URLs.

**Source Recipe:**
${JSON.stringify(sourceRecipeJson, null, 2)}

**Return ONLY valid JSON** matching the exact schema above. No markdown, no explanation, just the JSON object.`;

  // Call OpenAI API for translation
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3, // Lower temperature for more consistent translations
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No translation response received from AI");
  }

  // Parse the response - try to extract JSON from the response
  let translatedRecipe: RecipeJson;
  try {
    // Try to parse directly first
    translatedRecipe = JSON.parse(content);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      translatedRecipe = JSON.parse(jsonMatch[1].trim());
    } else {
      // Try to find JSON object in the response
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        translatedRecipe = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
      } else {
        throw new Error("Could not extract JSON from translation response");
      }
    }
  }

  // Validate the translated recipe
  if (!isValidRecipeJson(translatedRecipe)) {
    throw new Error("Translated recipe has invalid structure");
  }

  // Ensure locale is set correctly
  translatedRecipe.locale = targetLocale;

  // Ensure slug is valid
  if (!translatedRecipe.slug || translatedRecipe.slug === sourceRecipeJson.slug) {
    translatedRecipe.slug = generateSlug(translatedRecipe.title);
  }

  // Save as new version if requested
  if (saveAsNew) {
    const updateResult = await updateRecipeTool(userId, recipe.slug, {
      title: translatedRecipe.title,
      description: translatedRecipe.description,
      locale: targetLocale,
      recipeJson: translatedRecipe,
    });

    return {
      success: true,
      translatedRecipe,
      savedAsNewVersion: true,
      newVersion: updateResult.version,
      message: `Recipe translated to ${LOCALE_NAMES[targetLocale]} and saved as version ${updateResult.version}`,
    };
  }

  return {
    success: true,
    translatedRecipe,
    savedAsNewVersion: false,
    message: `Recipe translated to ${LOCALE_NAMES[targetLocale]}. Use saveAsNew: true to save the translation.`,
  };
}

/**
 * Get a recipe by its ID (for translation tool)
 */
export async function getRecipeByIdTool(
  userId: string,
  recipeId: number
): Promise<Recipe | null> {
  const userIdNum = parseInt(userId, 10);

  const result = await query<RecipeRow>(
    `SELECT * FROM recipes
     WHERE id = $1 AND user_id = $2 AND is_active = true`,
    [recipeId, userIdNum]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return rowToRecipe(result.rows[0]);
}
