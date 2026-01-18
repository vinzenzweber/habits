/**
 * Recipe sharing types
 * Reference-based sharing with version sync
 */

import { RecipeSummary, RecipeVersion, Recipe } from "./recipe-types";

// ============================================
// Permission Types
// ============================================

export type SharePermission = "view" | "edit" | "admin";

// ============================================
// Database Row Types
// ============================================

export interface RecipeShareRow {
  id: number;
  recipe_id: number;
  owner_user_id: number;
  shared_with_user_id: number;
  permission: SharePermission;
  message: string | null;
  created_at: Date;
}

export interface RecipeForkRow {
  id: number;
  original_recipe_id: number;
  original_owner_id: number;
  forked_recipe_id: number;
  forked_by_user_id: number;
  forked_at_version: number;
  created_at: Date;
}

// ============================================
// Application Types
// ============================================

export interface RecipeShare {
  id: number;
  recipeId: number;
  ownerUserId: number;
  sharedWithUserId: number;
  permission: SharePermission;
  message: string | null;
  createdAt: Date;
}

export interface RecipeFork {
  id: number;
  originalRecipeId: number;
  originalOwnerId: number;
  forkedRecipeId: number;
  forkedByUserId: number;
  forkedAtVersion: number;
  createdAt: Date;
}

/**
 * Recipe shared with the current user (inbox view)
 */
export interface SharedRecipeWithMe {
  shareId: number;
  recipeId: number;
  recipe: RecipeSummary;
  owner: {
    id: number;
    name: string;
    email: string;
  };
  permission: SharePermission;
  message: string | null;
  sharedAt: Date;
  currentVersion: number;
}

/**
 * Recipe I've shared with others (sent view)
 */
export interface MySharedRecipe {
  shareId: number;
  recipeId: number;
  recipeSummary: RecipeSummary;
  sharedWith: {
    id: number;
    name: string;
    email: string;
  };
  permission: SharePermission;
  message: string | null;
  sharedAt: Date;
}

/**
 * Full shared recipe with version history (detail view)
 */
export interface SharedRecipeDetail {
  shareId: number;
  recipeId: number;
  recipe: Recipe;
  owner: {
    id: number;
    name: string;
  };
  permission: SharePermission;
  sharedAt: Date;
  versionHistory: RecipeVersion[];
  forkInfo?: {
    canFork: boolean;
    alreadyForked: boolean;
    forkedRecipeSlug?: string;
  };
}

// ============================================
// Input Types
// ============================================

export interface ShareRecipeInput {
  recipeId: number;
  recipientEmail: string;
  permission?: SharePermission;
  message?: string;
}

// ============================================
// Row Converters
// ============================================

export function rowToRecipeShare(row: RecipeShareRow): RecipeShare {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    ownerUserId: row.owner_user_id,
    sharedWithUserId: row.shared_with_user_id,
    permission: row.permission,
    message: row.message,
    createdAt: row.created_at,
  };
}

export function rowToRecipeFork(row: RecipeForkRow): RecipeFork {
  return {
    id: row.id,
    originalRecipeId: row.original_recipe_id,
    originalOwnerId: row.original_owner_id,
    forkedRecipeId: row.forked_recipe_id,
    forkedByUserId: row.forked_by_user_id,
    forkedAtVersion: row.forked_at_version,
    createdAt: row.created_at,
  };
}
