-- Migration: Streak Preservation System
-- Adds nano workouts, streak shields, and rest day tracking

-- Add completion_type to track different types of completions
ALTER TABLE workout_completions
ADD COLUMN completion_type VARCHAR(20) NOT NULL DEFAULT 'full';
-- Values: 'full' (regular workout), 'nano' (3-min minimal workout), 'shield' (streak shield used), 'rest' (designated rest day)

COMMENT ON COLUMN workout_completions.completion_type IS 'Type of completion: full, nano, shield, or rest';

-- Track earned and used streak shields
CREATE TABLE streak_shields (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  earned_from_streak INTEGER NOT NULL, -- streak length when earned (7, 14, 21, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_streak_shields_user ON streak_shields(user_id);
CREATE INDEX idx_streak_shields_available ON streak_shields(user_id, used_at) WHERE used_at IS NULL;

COMMENT ON TABLE streak_shields IS 'Streak shields earned by completing 7 consecutive full workouts. Max stockpile: 2';

-- Track nano workout usage per week (limit: 2 per week)
CREATE TABLE nano_workout_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Monday of the week (ISO week start)
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_week UNIQUE (user_id, week_start)
);

CREATE INDEX idx_nano_usage_user_week ON nano_workout_usage(user_id, week_start);

COMMENT ON TABLE nano_workout_usage IS 'Tracks nano workout usage per week. Limit: 2 per week';

-- Track rest days used (limit: 1 per 7 days rolling)
CREATE TABLE rest_day_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rest_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_rest_date UNIQUE (user_id, rest_date)
);

CREATE INDEX idx_rest_day_user ON rest_day_usage(user_id, rest_date);

COMMENT ON TABLE rest_day_usage IS 'Tracks rest days taken. Limit: 1 per 7-day rolling period';
