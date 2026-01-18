-- Migration: 017_grocery_lists
-- Description: Add grocery list schema with sharing and real-time sync support
-- Created: 2026-01-18

-- ============================================
-- Grocery Lists (main table)
-- ============================================

CREATE TABLE grocery_lists (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding user's grocery lists
CREATE INDEX idx_grocery_lists_owner ON grocery_lists(owner_user_id);

-- Index for real-time sync (polling by updated_at)
CREATE INDEX idx_grocery_lists_updated ON grocery_lists(id, updated_at);

COMMENT ON TABLE grocery_lists IS 'User-owned grocery lists. Supports sharing via grocery_list_shares table.';

-- ============================================
-- Grocery List Sharing (reference model)
-- ============================================

CREATE TABLE grocery_list_shares (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(20) NOT NULL DEFAULT 'edit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate shares
  UNIQUE(list_id, shared_with_user_id),
  -- Validate permission values
  CHECK (permission IN ('view', 'edit'))
);

-- Index for finding lists shared with a user
CREATE INDEX idx_grocery_shares_user ON grocery_list_shares(shared_with_user_id);

-- Index for finding shares by list (owner management)
CREATE INDEX idx_grocery_shares_list ON grocery_list_shares(list_id);

COMMENT ON TABLE grocery_list_shares IS 'Grocery list sharing via reference model. Shared users see same list with real-time sync. Permission: view (read-only) or edit (can check/uncheck items).';

-- ============================================
-- Grocery List Items
-- ============================================

CREATE TABLE grocery_list_items (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  category VARCHAR(50),
  checked BOOLEAN NOT NULL DEFAULT false,
  checked_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  from_recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Validate category values
  CHECK (category IS NULL OR category IN (
    'produce', 'dairy', 'meat', 'bakery', 'pantry', 'frozen', 'beverages', 'other'
  ))
);

-- Index for getting items in a list (ordered by position)
CREATE INDEX idx_grocery_items_list ON grocery_list_items(list_id, position);

-- Index for filtering by checked status
CREATE INDEX idx_grocery_items_checked ON grocery_list_items(list_id, checked);

-- Index for finding items from a recipe
CREATE INDEX idx_grocery_items_recipe ON grocery_list_items(from_recipe_id) WHERE from_recipe_id IS NOT NULL;

COMMENT ON TABLE grocery_list_items IS 'Items in grocery lists. Tracks who checked each item for multi-user sync. from_recipe_id links to source recipe when auto-generated.';

-- ============================================
-- Trigger: Update grocery_lists.updated_at on item changes
-- ============================================

CREATE OR REPLACE FUNCTION update_grocery_list_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle DELETE case where NEW is null
  IF TG_OP = 'DELETE' THEN
    UPDATE grocery_lists SET updated_at = NOW() WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
  UPDATE grocery_lists SET updated_at = NOW() WHERE id = NEW.list_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grocery_items_update_list_timestamp
AFTER INSERT OR UPDATE OR DELETE ON grocery_list_items
FOR EACH ROW EXECUTE FUNCTION update_grocery_list_timestamp();

COMMENT ON FUNCTION update_grocery_list_timestamp() IS 'Auto-updates grocery_lists.updated_at when items change, enabling efficient polling for real-time sync.';
