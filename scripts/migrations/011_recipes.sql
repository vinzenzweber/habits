-- Migration: 011_recipes
-- Description: Add recipes feature with versioning and JSONB storage
-- Created: 2026-01-15

CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(200) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  locale VARCHAR(10) DEFAULT 'de-DE',
  tags JSONB DEFAULT '[]',
  recipe_json JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, slug, version)
);

-- Index for querying user's active recipes
CREATE INDEX idx_recipes_user_active ON recipes(user_id, is_active);

-- Index for querying by slug
CREATE INDEX idx_recipes_user_slug ON recipes(user_id, slug);

-- GIN index for tag-based filtering
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);

-- Full-text search index (German language)
CREATE INDEX idx_recipes_search ON recipes USING GIN(
  to_tsvector('german', title || ' ' || COALESCE(description, ''))
);

-- Unique partial index for active recipes (only one active version per slug)
CREATE UNIQUE INDEX idx_recipes_user_slug_active_unique
ON recipes(user_id, slug) WHERE is_active = true;
