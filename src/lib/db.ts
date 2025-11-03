import { Pool, type PoolConfig, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function resolveConfig(): PoolConfig {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL (or DATABASE_PUBLIC_URL) must be set to use the media manager."
    );
  }

  const sslConfig = connectionString.includes("railway.app") ||
    connectionString.includes("railway.internal")
    ? { rejectUnauthorized: false }
    : undefined;

  return {
    connectionString,
    ssl: sslConfig,
  } satisfies PoolConfig;
}

function getPool() {
  if (!pool) {
    pool = new Pool(resolveConfig());
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: Array<string | number | null> = []
) {
  const client = await getPool().connect();
  try {
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}

let initPromise: Promise<void> | null = null;

export function ensureDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS media_assets (
          id SERIAL PRIMARY KEY,
          stored_filename TEXT NOT NULL UNIQUE,
          original_filename TEXT NOT NULL,
          mime_type TEXT,
          size_bytes BIGINT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          thumbnail_filename TEXT
        );
      `);

      await query(`
        ALTER TABLE media_assets
        ADD COLUMN IF NOT EXISTS thumbnail_filename TEXT;
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS day_assignments (
          day_slug TEXT PRIMARY KEY,
          asset_id INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,
          assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    })();
  }

  return initPromise;
}

export type MediaAssetRow = {
  id: number;
  stored_filename: string;
  original_filename: string;
  mime_type: string | null;
  size_bytes: string | null;
  created_at: Date;
  thumbnail_filename: string | null;
};
