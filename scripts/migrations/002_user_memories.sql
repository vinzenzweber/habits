-- Migration: 002_user_memories
-- Description: Add user_memories table for personal trainer context
-- Created: 2026-01-03

-- User memories for personal trainer context
CREATE TABLE IF NOT EXISTS user_memories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'equipment', 'goals', 'medical', 'preferences', 'experience', 'schedule', 'measurements'
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category, key)
);
CREATE INDEX IF NOT EXISTS idx_memories_user ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_category ON user_memories(user_id, category);
