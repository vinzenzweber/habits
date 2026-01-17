/**
 * Test fixtures for collection-related tests
 * Provides mock factory functions for creating test data
 */

import type {
  Collection,
  CollectionRow,
  CollectionItem,
  CollectionItemRow,
  CollectionSummary,
  CollectionWithRecipes,
  ReceivedCollection,
  SentCollection,
} from '../../collection-types';
import { createMockRecipeSummary } from './recipe-fixtures';
import type { RecipeSummary } from '../../recipe-types';

/**
 * Create a mock CollectionRow (database row)
 */
export function createMockCollectionRow(overrides?: Partial<CollectionRow>): CollectionRow {
  return {
    id: 1,
    user_id: 1,
    name: 'Test Collection',
    description: 'A test collection for unit testing',
    cover_image_url: 'https://example.com/cover.jpg',
    is_shared: false,
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock Collection (TypeScript type)
 */
export function createMockCollection(overrides?: Partial<Collection>): Collection {
  return {
    id: 1,
    userId: 1,
    name: 'Test Collection',
    description: 'A test collection for unit testing',
    coverImageUrl: 'https://example.com/cover.jpg',
    isShared: false,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock CollectionItemRow (database row)
 */
export function createMockCollectionItemRow(overrides?: Partial<CollectionItemRow>): CollectionItemRow {
  return {
    id: 1,
    collection_id: 1,
    recipe_id: 1,
    added_at: new Date('2024-01-15T10:00:00Z'),
    position: 0,
    ...overrides,
  };
}

/**
 * Create a mock CollectionItem (TypeScript type)
 */
export function createMockCollectionItem(overrides?: Partial<CollectionItem>): CollectionItem {
  return {
    id: 1,
    collectionId: 1,
    recipeId: 1,
    addedAt: new Date('2024-01-15T10:00:00Z'),
    position: 0,
    ...overrides,
  };
}

/**
 * Create a mock CollectionSummary (for list views)
 */
export function createMockCollectionSummary(overrides?: Partial<CollectionSummary>): CollectionSummary {
  return {
    id: 1,
    name: 'Test Collection',
    description: 'A test collection for unit testing',
    coverImageUrl: 'https://example.com/cover.jpg',
    recipeCount: 5,
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock CollectionWithRecipes (for detail views)
 */
export function createMockCollectionWithRecipes(
  overrides?: Partial<CollectionWithRecipes>,
  recipes?: RecipeSummary[]
): CollectionWithRecipes {
  const mockRecipes = recipes ?? [
    createMockRecipeSummary({ slug: 'recipe-1', title: 'Recipe 1' }),
    createMockRecipeSummary({ slug: 'recipe-2', title: 'Recipe 2' }),
  ];
  return {
    id: 1,
    userId: 1,
    name: 'Test Collection',
    description: 'A test collection for unit testing',
    coverImageUrl: 'https://example.com/cover.jpg',
    isShared: false,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    recipes: mockRecipes,
    recipeCount: mockRecipes.length,
    ...overrides,
  };
}

/**
 * Create a mock ReceivedCollection (from sharing)
 */
export function createMockReceivedCollection(overrides?: Partial<ReceivedCollection>): ReceivedCollection {
  return {
    collection: createMockCollection(),
    sharedBy: {
      id: 2,
      name: 'Sender User',
      email: 'sender@example.com',
    },
    message: 'Check out my recipes!',
    receivedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock SentCollection (sharing history)
 */
export function createMockSentCollection(overrides?: Partial<SentCollection>): SentCollection {
  return {
    collection: createMockCollection({ isShared: true }),
    sharedWith: {
      id: 3,
      name: 'Recipient User',
      email: 'recipient@example.com',
    },
    message: 'Check out my recipes!',
    sentAt: new Date('2024-01-15T10:00:00Z'),
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
