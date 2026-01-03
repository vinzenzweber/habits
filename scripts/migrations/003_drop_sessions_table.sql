-- Migration: 003_drop_sessions_table
-- Description: Remove unused sessions table (using JWT strategy instead)

DROP INDEX IF EXISTS idx_sessions_user;
DROP INDEX IF EXISTS idx_sessions_token;
DROP TABLE IF EXISTS sessions;
