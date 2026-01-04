-- Migration: 005_exercise_library.sql
-- Description: Create global exercise library with images and background job queue

-- Global exercise library (shared across all users)
CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  normalized_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  form_cues TEXT,
  muscle_groups TEXT[],
  equipment TEXT[],
  category VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index for exercise lookup
CREATE INDEX IF NOT EXISTS idx_exercises_search ON exercises
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(form_cues, '')));

CREATE INDEX IF NOT EXISTS idx_exercises_normalized_name ON exercises(normalized_name);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);

-- Exercise images (2 per exercise: start position and end position)
CREATE TABLE IF NOT EXISTS exercise_images (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  image_index INTEGER NOT NULL CHECK (image_index IN (1, 2)),
  storage_path VARCHAR(500) NOT NULL,
  generation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reference_urls TEXT[],
  style_prompt TEXT,
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exercise_id, image_index)
);

CREATE INDEX IF NOT EXISTS idx_exercise_images_exercise ON exercise_images(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_images_status ON exercise_images(generation_status);

-- Background job queue for image generation
CREATE TABLE IF NOT EXISTS image_generation_jobs (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_pending ON image_generation_jobs(status, priority DESC)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_exercise ON image_generation_jobs(exercise_id);
