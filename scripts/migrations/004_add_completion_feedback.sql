-- Add difficulty rating and feedback columns to workout_completions
ALTER TABLE workout_completions
ADD COLUMN IF NOT EXISTS difficulty_rating VARCHAR(20),
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Index for querying by rating
CREATE INDEX IF NOT EXISTS idx_completions_rating
ON workout_completions(difficulty_rating)
WHERE difficulty_rating IS NOT NULL;
