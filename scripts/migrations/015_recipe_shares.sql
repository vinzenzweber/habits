-- Migration: 015_recipe_shares
-- Description: Add recipe sharing schema with reference model
-- Created: 2026-01-18

-- Track recipe shares (creates link/reference, not copy)
CREATE TABLE recipe_shares (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(20) NOT NULL DEFAULT 'view',  -- 'view', 'edit', 'admin'
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate shares
  UNIQUE(recipe_id, shared_with_user_id),
  -- Validate permission values
  CHECK (permission IN ('view', 'edit', 'admin'))
);

-- Index for finding recipes shared with a user (inbox view)
CREATE INDEX idx_recipe_shares_recipient ON recipe_shares(shared_with_user_id);

-- Index for finding shares by recipe (owner management view)
CREATE INDEX idx_recipe_shares_recipe ON recipe_shares(recipe_id);

-- Index for finding shares by owner (sent view)
CREATE INDEX idx_recipe_shares_owner ON recipe_shares(owner_user_id);

-- Comment explaining the architecture
COMMENT ON TABLE recipe_shares IS 'Recipe sharing via reference model. Recipients see original recipe with automatic version updates. Use recipe_forks for independent copies.';

-- Track forked recipes (when recipient creates their own independent copy)
CREATE TABLE recipe_forks (
  id SERIAL PRIMARY KEY,
  original_recipe_id INTEGER NOT NULL,  -- NOT a FK (allows tracking after deletion)
  original_owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forked_recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  forked_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forked_at_version INTEGER NOT NULL,  -- Which version was forked
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate forks of same recipe by same user
  UNIQUE(original_recipe_id, forked_by_user_id)
);

-- Index for finding forks by original recipe
CREATE INDEX idx_recipe_forks_original ON recipe_forks(original_recipe_id);

-- Index for finding forks by forked recipe
CREATE INDEX idx_recipe_forks_forked ON recipe_forks(forked_recipe_id);

-- Index for finding user's forked recipes
CREATE INDEX idx_recipe_forks_user ON recipe_forks(forked_by_user_id);

-- Comment explaining fork tracking
COMMENT ON TABLE recipe_forks IS 'Tracks when shared recipes are forked into independent copies. original_recipe_id is not a FK to allow tracking after original deletion.';
