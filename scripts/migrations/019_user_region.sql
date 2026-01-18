-- Migration: 019_user_region
-- Description: Add user region preference for regional ingredient localization
-- The timezone is used as a region indicator, NOT for time-related purposes

-- Add column for user's ingredient region preference
-- NULL means auto-detect from the general timezone column
-- When set, this overrides the general timezone for recipe regionalization
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_region_timezone VARCHAR(50) DEFAULT NULL;

-- Note: The timezone stored here is used ONLY to determine the user's geographic region
-- for ingredient name localization (e.g., Austrian "Schlagobers" vs German "Sahne").
-- It is NOT used for time-related calculations.
