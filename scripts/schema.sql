-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- Active workout plans with versioning (per user)
CREATE TABLE workouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(20) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  focus TEXT NOT NULL,
  description TEXT NOT NULL,
  workout_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, slug, version)
);
CREATE INDEX idx_workouts_user_slug_active ON workouts(user_id, slug) WHERE is_active = true;

-- Completed workout history
CREATE TABLE workout_completions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id INTEGER NOT NULL REFERENCES workouts(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workout_snapshot JSONB NOT NULL,
  duration_seconds INTEGER NOT NULL
);
CREATE INDEX idx_completions_user_date ON workout_completions(user_id, completed_at DESC);

-- Chat sessions
CREATE TABLE chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT
);
CREATE INDEX idx_sessions_user_created ON chat_sessions(user_id, created_at DESC);

-- Chat messages
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_session ON chat_messages(session_id, created_at);

-- User memories for personal trainer context
CREATE TABLE user_memories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'equipment', 'goals', 'medical', 'preferences', 'experience', 'schedule'
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category, key)
);
CREATE INDEX idx_memories_user ON user_memories(user_id);
CREATE INDEX idx_memories_category ON user_memories(user_id, category);
