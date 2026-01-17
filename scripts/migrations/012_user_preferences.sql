-- Migration: 012_user_preferences
-- Description: Add user preference columns for timezone, locale, and unit system
-- Created: 2026-01-17

-- Add user preference columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en-US';
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_system VARCHAR(20) DEFAULT 'metric';
