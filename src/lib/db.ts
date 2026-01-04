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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryParam = string | number | boolean | null | string[] | number[] | any;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: QueryParam[] = []
) {
  const client = await getPool().connect();
  try {
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: (client: {
    query: <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: Array<string | number | null>
    ) => Promise<{ rows: R[]; rowCount: number | null }>;
  }) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback({
      query: async (text, params = []) => {
        const res = await client.query(text, params);
        return res;
      }
    });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
