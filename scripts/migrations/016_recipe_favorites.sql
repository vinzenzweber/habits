-- Migration: 016_recipe_favorites
-- Description: Add recipe favorites table for users to mark recipes as favorites
-- Created: 2026-01-18

CREATE TABLE recipe_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- Index for efficient lookup by user
CREATE INDEX idx_recipe_favorites_user_id ON recipe_favorites(user_id);

-- Index for efficient lookup by recipe
CREATE INDEX idx_recipe_favorites_recipe_id ON recipe_favorites(recipe_id);

-- Comment explaining the architecture
COMMENT ON TABLE recipe_favorites IS 'User favorites for quick recipe access. Separate from recipe JSONB for lightweight queries and independent of versioning.';
