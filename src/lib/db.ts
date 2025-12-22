import { Pool, type PoolConfig, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function resolveConfig(): PoolConfig {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL (or DATABASE_PUBLIC_URL) must be set to use the database."
    );
  }

  const sslConfig =
    connectionString.includes("railway.app") ||
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
