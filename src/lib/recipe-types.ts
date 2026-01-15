/**
 * Recipe feature types
 * Follows workout pattern with JSONB storage and versioning
 */

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  notes?: string;
  isOptional?: boolean;
}

export interface InstructionStep {
  id: string;
  step: number;
  text: string;
  durationMinutes?: number;
  tip?: string;
}

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
}

export type RecipeSourceType = "manual" | "imported" | "shared" | "ai_generated";

export interface RecipeJson {
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  nutrition?: NutritionInfo;
  notes?: string;
  imageUrl?: string;
  // Metadata fields stored in JSONB
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  sourceType?: RecipeSourceType;
  sourceUrl?: string;
  isFavorite?: boolean;
  rating?: number;
}

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

// Input types for creating/updating
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
