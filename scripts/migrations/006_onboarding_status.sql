-- Migration: Add onboarding status tracking to users table
-- This enables tracking whether a user has completed the onboarding flow

ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN onboarding_started_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

-- Index for quickly finding users who haven't completed onboarding
CREATE INDEX idx_users_onboarding_incomplete ON users(id) WHERE onboarding_completed = false;

-- Mark existing users as having completed onboarding (they already have workouts)
UPDATE users SET onboarding_completed = true, onboarding_completed_at = NOW();
