-- Migration: Add unique partial index for active workouts
-- Required for ON CONFLICT clause in workout-generator.ts

-- Create unique partial index for active workouts per user per slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_user_slug_active_unique
ON workouts(user_id, slug) WHERE is_active = true;
