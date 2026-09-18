import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { requiredEnv } from "./env.mjs";

const { Pool } = pg;
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationDirectory = path.join(rootDirectory, "migrations");
const pool = new Pool({ connectionString: requiredEnv("DATABASE_URL") });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `);
    const files = (await readdir(migrationDirectory))
      .filter((file) => /^\d+_[-a-z0-9]+\.sql$/i.test(file))
      .sort();
    const { rows } = await client.query("select filename from schema_migrations");
    const applied = new Set(rows.map((row) => row.filename));

    for (const filename of files) {
      if (applied.has(filename)) continue;
      const sql = await readFile(path.join(migrationDirectory, filename), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (filename) values ($1)", [filename]);
        await client.query("commit");
        console.log(`Applied ${filename}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Database migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
