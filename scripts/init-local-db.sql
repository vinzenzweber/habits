-- Run these statements as the postgres superuser.
CREATE ROLE habits_app WITH LOGIN PASSWORD 'habits_password';
ALTER ROLE habits_app WITH LOGIN;

CREATE DATABASE habits OWNER habits_app;

GRANT ALL PRIVILEGES ON DATABASE habits TO habits_app;
