/**
 * Recipe collection types
 * Supports organizing recipes into groups and sharing via Copy-on-Share model
 */

import { RecipeSummary } from "./recipe-types";

// ============================================
// Database Row Types (snake_case)
// ============================================

export interface CollectionRow {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_shared: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CollectionItemRow {
  id: number;
  collection_id: number;
  recipe_id: number;
  added_at: Date;
  position: number;
}

export interface CollectionShareRow {
  id: number;
  original_collection_id: number;
  shared_by_user_id: number;
  shared_with_user_id: number;
  copied_collection_id: number;
  message: string | null;
  created_at: Date;
}

// ============================================
// TypeScript Types (camelCase)
// ============================================

export interface Collection {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionItem {
  id: number;
  collectionId: number;
  recipeId: number;
  addedAt: Date;
  position: number;
}

export interface CollectionShare {
  id: number;
  originalCollectionId: number;
  sharedByUserId: number;
  sharedWithUserId: number;
  copiedCollectionId: number;
  message: string | null;
  createdAt: Date;
}

// ============================================
// Extended Types
// ============================================

/**
 * Collection with its recipes (for detail views)
 */
export interface CollectionWithRecipes extends Collection {
  recipes: RecipeSummary[];
  recipeCount: number;
}

/**
 * Summary type for list views (lightweight)
 */
export interface CollectionSummary {
  id: number;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  recipeCount: number;
  updatedAt: Date;
}

/**
 * Collection received from another user (from sharing)
 */
export interface ReceivedCollection {
  collection: Collection;
  sharedBy: { id: number; name: string; email: string };
  message: string | null;
  receivedAt: Date;
}

/**
 * Collection shared to another user (sharing history)
 */
export interface SentCollection {
  collection: Collection;
  sharedWith: { id: number; name: string; email: string };
  message: string | null;
  sentAt: Date;
}

// ============================================
// Input Types
// ============================================

export interface CreateCollectionInput {
  name: string;
  description?: string;
  coverImageUrl?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string;
  coverImageUrl?: string;
}

// ============================================
// Converter Functions
// ============================================

/**
 * Convert database row to TypeScript Collection type
 */
export function rowToCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    isShared: row.is_shared,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert database row to TypeScript CollectionItem type
 */
export function rowToCollectionItem(row: CollectionItemRow): CollectionItem {
  return {
    id: row.id,
    collectionId: row.collection_id,
    recipeId: row.recipe_id,
    addedAt: row.added_at,
    position: row.position,
  };
}

/**
 * Convert database row to TypeScript CollectionShare type
 */
export function rowToCollectionShare(row: CollectionShareRow): CollectionShare {
  return {
    id: row.id,
    originalCollectionId: row.original_collection_id,
    sharedByUserId: row.shared_by_user_id,
    sharedWithUserId: row.shared_with_user_id,
    copiedCollectionId: row.copied_collection_id,
    message: row.message,
    createdAt: row.created_at,
  };
}
