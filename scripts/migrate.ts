#!/usr/bin/env npx tsx
/**
 * Database Migration Runner
 *
 * Usage:
 *   npx tsx scripts/migrate.ts          # Run all pending migrations
 *   npx tsx scripts/migrate.ts status   # Show migration status
 *
 * Or via npm script:
 *   npm run db:migrate
 *   npm run db:migrate:status
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file manually (without dotenv dependency)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex);
        const value = trimmed.substring(eqIndex + 1);
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Create pool from environment
function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  return new Pool({ connectionString });
}

// Ensure migrations tracking table exists
async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// Get list of applied migrations
async function getAppliedMigrations(pool: Pool): Promise<string[]> {
  const result = await pool.query('SELECT name FROM _migrations ORDER BY name');
  return result.rows.map(row => row.name);
}

// Get list of migration files
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`ERROR: Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

// Run a single migration
async function runMigration(pool: Pool, filename: string): Promise<void> {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Run the migration SQL
    await client.query(sql);

    // Record the migration
    await client.query(
      'INSERT INTO _migrations (name) VALUES ($1)',
      [filename]
    );

    await client.query('COMMIT');
    console.log(`  ✓ Applied: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Show migration status
async function showStatus(pool: Pool): Promise<void> {
  const applied = await getAppliedMigrations(pool);
  const files = getMigrationFiles();

  console.log('\nMigration Status:');
  console.log('─'.repeat(50));

  for (const file of files) {
    const status = applied.includes(file) ? '✓ Applied' : '○ Pending';
    console.log(`  ${status}  ${file}`);
  }

  const pending = files.filter(f => !applied.includes(f));
  console.log('─'.repeat(50));
  console.log(`Total: ${files.length} | Applied: ${applied.length} | Pending: ${pending.length}\n`);
}

// Run all pending migrations
async function runMigrations(pool: Pool): Promise<void> {
  const applied = await getAppliedMigrations(pool);
  const files = getMigrationFiles();
  const pending = files.filter(f => !applied.includes(f));

  if (pending.length === 0) {
    console.log('\n✓ Database is up to date. No migrations to run.\n');
    return;
  }

  console.log(`\nRunning ${pending.length} migration(s)...\n`);

  for (const file of pending) {
    await runMigration(pool, file);
  }

  console.log(`\n✓ Successfully applied ${pending.length} migration(s).\n`);
}

// Main entry point
async function main(): Promise<void> {
  const command = process.argv[2] || 'up';
  const pool = createPool();

  try {
    await ensureMigrationsTable(pool);

    switch (command) {
      case 'up':
      case 'migrate':
        await runMigrations(pool);
        break;
      case 'status':
        await showStatus(pool);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Usage: migrate.ts [up|status]');
        process.exit(1);
    }
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
