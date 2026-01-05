-- Migration: Ensure onboarding columns exist (fix for 006 if it failed partially)
-- This is idempotent and safe to run multiple times

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Index for quickly finding users who haven't completed onboarding
CREATE INDEX IF NOT EXISTS idx_users_onboarding_incomplete ON users(id) WHERE onboarding_completed = false;

-- Mark existing users (who have workouts) as having completed onboarding
UPDATE users u
SET onboarding_completed = true, onboarding_completed_at = NOW()
WHERE onboarding_completed = false
AND EXISTS (SELECT 1 FROM workouts w WHERE w.user_id = u.id);
