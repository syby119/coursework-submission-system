import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { getConfig } from "@/lib/config";

let pool: Pool | undefined;

types.setTypeParser(1184, (value) => value);

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getConfig().databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export async function query<Row extends QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<Row>(text, values);
}

export async function transaction<T>(operation: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
