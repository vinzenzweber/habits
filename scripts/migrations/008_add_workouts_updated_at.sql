-- Migration: Add updated_at column to workouts table
-- Required by workout-generator.ts for ON CONFLICT UPDATE

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Set existing rows to use created_at as initial updated_at
UPDATE workouts SET updated_at = created_at WHERE updated_at = NOW();
