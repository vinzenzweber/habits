#!/usr/bin/env bash
set -euo pipefail

DB_NAME=${DB_NAME:-habits}
DB_USER=${DB_USER:-habits_app}
DB_PASSWORD=${DB_PASSWORD:-habits_password}
DB_PORT=${DB_PORT:-5432}
DB_HOST=${DB_HOST:-127.0.0.1}

echo "Creating role '${DB_USER}' (if needed)…"
psql --host="${DB_HOST}" --port="${DB_PORT}" --username=postgres --no-password <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SQL

echo "Creating database '${DB_NAME}' owned by '${DB_USER}'…"
psql --host="${DB_HOST}" --port="${DB_PORT}" --username=postgres --no-password <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}') THEN
    CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
  END IF;
END
\$\$;
SQL

echo "Database setup complete."
