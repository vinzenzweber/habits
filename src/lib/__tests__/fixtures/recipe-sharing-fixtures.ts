/**
 * Test fixtures for recipe sharing tests
 * Provides mock factory functions for creating test data
 */

import type {
  RecipeShareRow,
  RecipeForkRow,
  RecipeShare,
  RecipeFork,
  SharedRecipeWithMe,
  MySharedRecipe,
  SharedRecipeDetail,
  SharePermission,
} from '../../recipe-sharing-types';
import { createMockRecipe, createMockRecipeSummary } from './recipe-fixtures';
import type { RecipeVersion } from '../../recipe-types';

/**
 * Create a mock RecipeShareRow (database row)
 */
export function createMockRecipeShareRow(overrides?: Partial<RecipeShareRow>): RecipeShareRow {
  return {
    id: 1,
    recipe_id: 1,
    owner_user_id: 1,
    shared_with_user_id: 2,
    permission: 'view',
    message: 'Check out this recipe!',
    created_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock RecipeForkRow (database row)
 */
export function createMockRecipeForkRow(overrides?: Partial<RecipeForkRow>): RecipeForkRow {
  return {
    id: 1,
    original_recipe_id: 1,
    original_owner_id: 1,
    forked_recipe_id: 2,
    forked_by_user_id: 2,
    forked_at_version: 1,
    created_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock RecipeShare (TypeScript type)
 */
export function createMockRecipeShare(overrides?: Partial<RecipeShare>): RecipeShare {
  return {
    id: 1,
    recipeId: 1,
    ownerUserId: 1,
    sharedWithUserId: 2,
    permission: 'view',
    message: 'Check out this recipe!',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock RecipeFork (TypeScript type)
 */
export function createMockRecipeFork(overrides?: Partial<RecipeFork>): RecipeFork {
  return {
    id: 1,
    originalRecipeId: 1,
    originalOwnerId: 1,
    forkedRecipeId: 2,
    forkedByUserId: 2,
    forkedAtVersion: 1,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock SharedRecipeWithMe (inbox view)
 */
export function createMockSharedRecipeWithMe(overrides?: Partial<SharedRecipeWithMe>): SharedRecipeWithMe {
  return {
    shareId: 1,
    recipeId: 1,
    recipe: createMockRecipeSummary(),
    owner: {
      id: 1,
      name: 'Owner User',
      email: 'owner@example.com',
    },
    permission: 'view',
    message: 'Check out this recipe!',
    sharedAt: new Date('2024-01-15T10:00:00Z'),
    currentVersion: 1,
    ...overrides,
  };
}

/**
 * Create a mock MySharedRecipe (sent view)
 */
export function createMockMySharedRecipe(overrides?: Partial<MySharedRecipe>): MySharedRecipe {
  return {
    shareId: 1,
    recipeId: 1,
    recipeSummary: createMockRecipeSummary(),
    sharedWith: {
      id: 2,
      name: 'Recipient User',
      email: 'recipient@example.com',
    },
    permission: 'view',
    message: 'Check out this recipe!',
    sharedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock SharedRecipeDetail (detail view)
 */
export function createMockSharedRecipeDetail(overrides?: Partial<SharedRecipeDetail>): SharedRecipeDetail {
  return {
    shareId: 1,
    recipeId: 1,
    recipe: createMockRecipe(),
    owner: {
      id: 1,
      name: 'Owner User',
    },
    permission: 'view',
    sharedAt: new Date('2024-01-15T10:00:00Z'),
    versionHistory: [createMockRecipeVersion()],
    forkInfo: {
      canFork: true,
      alreadyForked: false,
    },
    ...overrides,
  };
}

/**
 * Create a mock RecipeVersion
 */
export function createMockRecipeVersion(overrides?: Partial<RecipeVersion>): RecipeVersion {
  return {
    version: 1,
    title: 'Test Recipe',
    description: 'A test recipe',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    isActive: true,
    ...overrides,
  };
}

/**
 * Create a mock user for testing sharing functionality
 */
export function createMockUser(overrides?: { id?: number; name?: string; email?: string }) {
  return {
    id: overrides?.id ?? 1,
    name: overrides?.name ?? 'Test User',
    email: overrides?.email ?? 'test@example.com',
  };
}

/**
 * Create mock permission types for testing
 */
export function getMockPermissions(): SharePermission[] {
  return ['view', 'edit', 'admin'];
}
