-- Migration: 013_recipe_collections
-- Description: Add recipe collections feature for organizing recipes and sharing
-- Created: 2026-01-17

-- ============================================
-- Table: recipe_collections
-- Main collections table for organizing recipes
-- ============================================
CREATE TABLE recipe_collections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying user's collections
CREATE INDEX idx_recipe_collections_user ON recipe_collections(user_id);

-- ============================================
-- Table: recipe_collection_items
-- Junction table for many-to-many relationship between collections and recipes
-- ============================================
CREATE TABLE recipe_collection_items (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  position INTEGER DEFAULT 0,
  UNIQUE(collection_id, recipe_id)
);

-- Index for querying items by collection (most common query)
CREATE INDEX idx_collection_items_collection ON recipe_collection_items(collection_id);

-- Index for querying which collections a recipe belongs to
CREATE INDEX idx_collection_items_recipe ON recipe_collection_items(recipe_id);

-- ============================================
-- Table: collection_shares
-- Track sharing history using Copy-on-Share model
-- ============================================
CREATE TABLE collection_shares (
  id SERIAL PRIMARY KEY,
  -- Note: original_collection_id is NOT a foreign key because the original may be deleted
  original_collection_id INTEGER NOT NULL,
  shared_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  copied_collection_id INTEGER NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate shares of same collection to same recipient
  UNIQUE(original_collection_id, shared_by_user_id, shared_with_user_id)
);

-- Index for querying collections shared with a user (inbox view)
CREATE INDEX idx_collection_shares_recipient ON collection_shares(shared_with_user_id);

-- Index for querying collections a user has shared (sent view)
CREATE INDEX idx_collection_shares_sender ON collection_shares(shared_by_user_id);
