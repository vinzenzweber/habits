-- Migration: 014_recipe_ratings
-- Description: Add recipe ratings table for multi-user version-aware ratings
-- Created: 2026-01-18

CREATE TABLE recipe_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL,
  recipe_version INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, recipe_id, recipe_version)
);

-- Index for querying ratings by recipe and version
CREATE INDEX idx_recipe_ratings_recipe_version ON recipe_ratings(recipe_id, recipe_version);

-- Index for querying user's ratings
CREATE INDEX idx_recipe_ratings_user ON recipe_ratings(user_id);

-- Comment explaining the architecture
COMMENT ON TABLE recipe_ratings IS 'Multi-user ratings tied to specific recipe versions. Each user can rate each version once.';
