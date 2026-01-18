-- Migration: 018_recipe_preferences
-- Description: Add recipe-specific locale preferences for users
-- This allows users to have separate settings for app formatting vs recipe content

-- Add column for default recipe locale (separate from general locale)
-- NULL means inherit from the general locale setting
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_recipe_locale VARCHAR(10) DEFAULT NULL;

-- Add column for showing measurement conversions inline
-- When true, shows both metric and imperial (e.g., "500ml (2 cups)")
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_measurement_conversions BOOLEAN DEFAULT false;

-- Note: measurement_system preference reuses the existing unit_system column
-- If default_recipe_locale is NULL, the application falls back to the locale column
