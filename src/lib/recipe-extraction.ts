/**
 * Recipe extraction from images using GPT-4 Vision
 * Extracts recipe data (title, ingredients, steps, nutrition) from photos
 */

import OpenAI from 'openai';
import type { RecipeJson, NutritionInfo, IngredientGroup, RecipeStep } from './recipe-types';

// Lazy initialization to avoid requiring OPENAI_API_KEY at build time
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * GPT-4 Vision prompt for recipe extraction
 */
const EXTRACTION_PROMPT = `Extract the recipe from this image and return it as JSON.

Return ONLY valid JSON with this exact structure:
{
  "title": "Recipe name",
  "description": "Brief 1-2 sentence description",
  "servings": <number>,
  "prepTimeMinutes": <number or null if not visible>,
  "cookTimeMinutes": <number or null if not visible>,
  "locale": "en-US" or "de-DE" based on language detected,
  "tags": ["tag1", "tag2"],
  "nutrition": {
    "calories": <number>,
    "protein": <number in grams>,
    "carbohydrates": <number in grams>,
    "fat": <number in grams>
  },
  "ingredientGroups": [
    {
      "name": "Group name (e.g., 'Main Ingredients', 'Sauce')",
      "ingredients": [
        { "name": "ingredient name", "quantity": <number>, "unit": "unit string" }
      ]
    }
  ],
  "steps": [
    { "number": 1, "instruction": "Step instruction text" }
  ]
}

Important rules:
- If nutrition info is not visible, estimate reasonable values based on the ingredients
- Group ingredients logically (e.g., separate sauces, toppings, main dish)
- For handwritten recipes, do your best to interpret the text
- If quantities are vague (e.g., "some salt"), use reasonable defaults (e.g., 0.5, "tsp")
- Detect the language and set locale accordingly (de-DE for German, en-US for English, etc.)
- Tags should include: meal type (breakfast/lunch/dinner), dietary info (vegetarian/vegan), cuisine type

If you cannot extract a recipe from this image, return:
{ "error": "Reason why extraction failed" }`;

/**
 * Extracted recipe data before validation/slug generation
 */
export interface ExtractedRecipeData {
  title: string;
  description: string;
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  locale: string;
  tags: string[];
  nutrition: NutritionInfo;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
}

/**
 * Result from extraction - either success with data or error
 */
export type ExtractionResult =
  | { success: true; data: ExtractedRecipeData }
  | { success: false; error: string };

/**
 * Parse and validate the raw GPT response into ExtractedRecipeData
 * Exported for testing purposes
 */
export function parseExtractionResponse(rawJson: unknown): ExtractionResult {
  if (typeof rawJson !== 'object' || rawJson === null) {
    return { success: false, error: 'Invalid response format from vision model' };
  }

  const data = rawJson as Record<string, unknown>;

  // Check for error response from the model
  if ('error' in data && typeof data.error === 'string') {
    return { success: false, error: data.error };
  }

  // Validate required fields
  if (typeof data.title !== 'string' || !data.title.trim()) {
    return { success: false, error: 'Could not extract recipe title' };
  }

  // Build the extracted data with defaults for missing fields
  const extracted: ExtractedRecipeData = {
    title: data.title.trim(),
    description: typeof data.description === 'string' ? data.description.trim() : '',
    servings: typeof data.servings === 'number' && data.servings > 0 ? data.servings : 4,
    prepTimeMinutes: typeof data.prepTimeMinutes === 'number' ? data.prepTimeMinutes : undefined,
    cookTimeMinutes: typeof data.cookTimeMinutes === 'number' ? data.cookTimeMinutes : undefined,
    locale: typeof data.locale === 'string' ? data.locale : 'en-US',
    tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === 'string') : [],
    nutrition: parseNutrition(data.nutrition),
    ingredientGroups: parseIngredientGroups(data.ingredientGroups),
    steps: parseSteps(data.steps),
  };

  // Validate we have at least some content
  if (extracted.ingredientGroups.length === 0 && extracted.steps.length === 0) {
    return { success: false, error: 'Could not extract ingredients or steps from image' };
  }

  return { success: true, data: extracted };
}

/**
 * Parse nutrition info with defaults
 */
function parseNutrition(raw: unknown): NutritionInfo {
  const defaults: NutritionInfo = {
    calories: 300,
    protein: 15,
    carbohydrates: 30,
    fat: 10,
  };

  if (typeof raw !== 'object' || raw === null) {
    return defaults;
  }

  const nutrition = raw as Record<string, unknown>;

  return {
    calories: typeof nutrition.calories === 'number' ? nutrition.calories : defaults.calories,
    protein: typeof nutrition.protein === 'number' ? nutrition.protein : defaults.protein,
    carbohydrates: typeof nutrition.carbohydrates === 'number' ? nutrition.carbohydrates : defaults.carbohydrates,
    fat: typeof nutrition.fat === 'number' ? nutrition.fat : defaults.fat,
    fiber: typeof nutrition.fiber === 'number' ? nutrition.fiber : undefined,
  };
}

/**
 * Parse ingredient groups with validation
 */
function parseIngredientGroups(raw: unknown): IngredientGroup[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((group): group is Record<string, unknown> => typeof group === 'object' && group !== null)
    .map((group) => ({
      name: typeof group.name === 'string' ? group.name : 'Ingredients',
      ingredients: Array.isArray(group.ingredients)
        ? group.ingredients
            .filter((ing): ing is Record<string, unknown> => typeof ing === 'object' && ing !== null)
            .map((ing) => ({
              name: typeof ing.name === 'string' ? ing.name : 'Unknown ingredient',
              quantity: typeof ing.quantity === 'number' ? ing.quantity : 1,
              unit: typeof ing.unit === 'string' ? ing.unit : '',
            }))
        : [],
    }))
    .filter((group) => group.ingredients.length > 0);
}

/**
 * Parse recipe steps with validation
 */
function parseSteps(raw: unknown): RecipeStep[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((step): step is Record<string, unknown> => typeof step === 'object' && step !== null)
    .map((step, index) => ({
      number: typeof step.number === 'number' ? step.number : index + 1,
      instruction: typeof step.instruction === 'string' ? step.instruction : '',
    }))
    .filter((step) => step.instruction.trim().length > 0);
}

/**
 * Extract recipe data from a base64-encoded image using GPT-4 Vision
 *
 * @param imageBase64 - Base64-encoded image data (without data URL prefix)
 * @returns Extraction result with either the parsed recipe data or an error message
 */
export async function extractRecipeFromImage(imageBase64: string): Promise<ExtractionResult> {
  const openai = getOpenAI();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'No response from vision model' };
    }

    // Parse the JSON response
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { success: false, error: 'Invalid JSON response from vision model' };
    }

    return parseExtractionResponse(parsed);
  } catch (error) {
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return { success: false, error: 'Too many requests. Please wait a moment and try again.' };
      }
      if (error.status === 400 && error.message.includes('image')) {
        return { success: false, error: 'Image could not be processed. Please try a different image.' };
      }
      console.error('OpenAI API error:', error.message);
      return { success: false, error: 'Failed to analyze image. Please try again.' };
    }

    console.error('Recipe extraction error:', error);
    return { success: false, error: 'Recipe extraction failed. Please try again.' };
  }
}

/**
 * Convert extracted recipe data to a complete RecipeJson structure
 * Used after extraction to prepare for saving
 */
export function toRecipeJson(
  extracted: ExtractedRecipeData,
  slug: string,
  imageUrl?: string
): RecipeJson {
  return {
    slug,
    title: extracted.title,
    description: extracted.description,
    tags: extracted.tags,
    servings: extracted.servings,
    prepTimeMinutes: extracted.prepTimeMinutes,
    cookTimeMinutes: extracted.cookTimeMinutes,
    nutrition: extracted.nutrition,
    ingredientGroups: extracted.ingredientGroups,
    steps: extracted.steps,
    images: imageUrl ? [{ url: imageUrl, isPrimary: true }] : [],
    locale: extracted.locale,
    sourceType: 'ai_generated',
  };
}
