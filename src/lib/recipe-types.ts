/**
 * Recipe feature types
 * Follows workout pattern with JSONB storage and versioning
 */

// ============================================
// Core Recipe Types
// ============================================

export type NutritionInfo = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
};

export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
};

export type IngredientGroup = {
  name: string; // e.g., "Milchprodukte", "Proteinpulver"
  ingredients: Ingredient[];
};

export type RecipeStep = {
  number: number;
  instruction: string;
};

export type RecipeImage = {
  url: string;
  caption?: string;
  isPrimary?: boolean;
};

export type RecipeSourceType = "manual" | "imported" | "shared" | "ai_generated";

/**
 * Full recipe data stored in JSONB
 * This is what gets stored in recipe_json column
 */
export type RecipeJson = {
  slug: string; // URL-friendly ID from title
  title: string;
  description: string;
  tags: string[];
  servings: number;
  prepTimeMinutes?: number; // Preparation time
  cookTimeMinutes?: number; // Cooking time
  nutrition: NutritionInfo;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
  images: RecipeImage[]; // 1-10 images required
  locale: string; // e.g., "de-DE", "en-US"
  // Metadata
  sourceType?: RecipeSourceType;
  sourceUrl?: string;
  isFavorite?: boolean;
  rating?: number;
  notes?: string;
};

// ============================================
// List/Summary Types
// ============================================

/**
 * Summary type for list views (lightweight, no full recipe data)
 */
export type RecipeSummary = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  primaryImage?: RecipeImage;
  nutrition: NutritionInfo;
  isFavorite?: boolean;
  rating?: number;
  updatedAt?: Date;
};

// ============================================
// Version History Type
// ============================================

/**
 * Lightweight type for version history retrieval
 */
export type RecipeVersion = {
  version: number;
  title: string;
  description: string | null;
  createdAt: Date;
  isActive: boolean;
};

// ============================================
// Database Types
// ============================================

export interface Recipe {
  id: number;
  userId: number;
  slug: string;
  version: number;
  title: string;
  description: string | null;
  locale: string;
  tags: string[];
  recipeJson: RecipeJson;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Database row type (snake_case)
export interface RecipeRow {
  id: number;
  user_id: number;
  slug: string;
  version: number;
  title: string;
  description: string | null;
  locale: string;
  tags: string[];
  recipe_json: RecipeJson;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Convert database row to TypeScript type
export function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    version: row.version,
    title: row.title,
    description: row.description,
    locale: row.locale,
    tags: row.tags,
    recipeJson: row.recipe_json,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// Input Types
// ============================================

export interface CreateRecipeInput {
  title: string;
  description?: string;
  locale?: string;
  tags?: string[];
  recipeJson: RecipeJson;
}

export interface UpdateRecipeInput {
  title?: string;
  description?: string;
  locale?: string;
  tags?: string[];
  recipeJson?: RecipeJson;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (ä→a, ü→u, etc.)
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
    .substring(0, 200); // Max length
}

/**
 * Get the primary image from a recipe, or the first image if none is marked primary
 */
export function getPrimaryImage(images: RecipeImage[]): RecipeImage | undefined {
  if (images.length === 0) return undefined;
  return images.find((img) => img.isPrimary) ?? images[0];
}

/**
 * Convert a full Recipe to a RecipeSummary for list views
 */
export function toRecipeSummary(recipe: Recipe): RecipeSummary {
  const { recipeJson } = recipe;
  return {
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description ?? recipeJson.description,
    tags: recipe.tags,
    servings: recipeJson.servings,
    prepTimeMinutes: recipeJson.prepTimeMinutes,
    cookTimeMinutes: recipeJson.cookTimeMinutes,
    primaryImage: getPrimaryImage(recipeJson.images),
    nutrition: recipeJson.nutrition,
  };
}

/**
 * Calculate total time (prep + cook) in minutes
 */
export function getTotalTimeMinutes(recipe: RecipeJson): number | undefined {
  if (recipe.prepTimeMinutes === undefined && recipe.cookTimeMinutes === undefined) {
    return undefined;
  }
  return (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
}

/**
 * Get all ingredients from all groups as a flat list
 */
export function getAllIngredients(recipe: RecipeJson): Ingredient[] {
  return recipe.ingredientGroups.flatMap((group) => group.ingredients);
}

/**
 * Count total number of ingredients across all groups
 */
export function getIngredientCount(recipe: RecipeJson): number {
  return getAllIngredients(recipe).length;
}

// ============================================
// Type Guards
// ============================================

export function isValidNutritionInfo(obj: unknown): obj is NutritionInfo {
  if (typeof obj !== "object" || obj === null) return false;
  const nutrition = obj as Record<string, unknown>;
  return (
    typeof nutrition.calories === "number" &&
    typeof nutrition.protein === "number" &&
    typeof nutrition.carbohydrates === "number" &&
    typeof nutrition.fat === "number" &&
    (nutrition.fiber === undefined || typeof nutrition.fiber === "number")
  );
}

export function isValidIngredient(obj: unknown): obj is Ingredient {
  if (typeof obj !== "object" || obj === null) return false;
  const ingredient = obj as Record<string, unknown>;
  return (
    typeof ingredient.name === "string" &&
    typeof ingredient.quantity === "number" &&
    typeof ingredient.unit === "string"
  );
}

export function isValidIngredientGroup(obj: unknown): obj is IngredientGroup {
  if (typeof obj !== "object" || obj === null) return false;
  const group = obj as Record<string, unknown>;
  return (
    typeof group.name === "string" &&
    Array.isArray(group.ingredients) &&
    group.ingredients.every(isValidIngredient)
  );
}

export function isValidRecipeStep(obj: unknown): obj is RecipeStep {
  if (typeof obj !== "object" || obj === null) return false;
  const step = obj as Record<string, unknown>;
  return typeof step.number === "number" && typeof step.instruction === "string";
}

export function isValidRecipeImage(obj: unknown): obj is RecipeImage {
  if (typeof obj !== "object" || obj === null) return false;
  const image = obj as Record<string, unknown>;
  return (
    typeof image.url === "string" &&
    (image.caption === undefined || typeof image.caption === "string") &&
    (image.isPrimary === undefined || typeof image.isPrimary === "boolean")
  );
}

export function isValidRecipeJson(obj: unknown): obj is RecipeJson {
  if (typeof obj !== "object" || obj === null) return false;
  const recipe = obj as Record<string, unknown>;
  return (
    typeof recipe.slug === "string" &&
    typeof recipe.title === "string" &&
    typeof recipe.description === "string" &&
    Array.isArray(recipe.tags) &&
    recipe.tags.every((tag) => typeof tag === "string") &&
    typeof recipe.servings === "number" &&
    (recipe.prepTimeMinutes === undefined || typeof recipe.prepTimeMinutes === "number") &&
    (recipe.cookTimeMinutes === undefined || typeof recipe.cookTimeMinutes === "number") &&
    isValidNutritionInfo(recipe.nutrition) &&
    Array.isArray(recipe.ingredientGroups) &&
    recipe.ingredientGroups.every(isValidIngredientGroup) &&
    Array.isArray(recipe.steps) &&
    recipe.steps.every(isValidRecipeStep) &&
    Array.isArray(recipe.images) &&
    recipe.images.length >= 1 &&
    recipe.images.length <= 10 &&
    recipe.images.every(isValidRecipeImage) &&
    typeof recipe.locale === "string"
  );
}
