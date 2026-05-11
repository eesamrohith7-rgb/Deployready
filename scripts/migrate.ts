/* eslint-disable no-console */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const DB_URL = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/webaudit";

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log(`[migrate] connected to ${DB_URL}`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const dir = path.join(process.cwd(), "db", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const f of files) {
    const version = f.replace(/\.sql$/, "");
    const exists = await client.query("SELECT 1 FROM schema_migrations WHERE version=$1", [version]);
    if (exists.rowCount) {
      console.log(`[migrate] skip ${version}`);
      continue;
    }
    const sql = await readFile(path.join(dir, f), "utf8");
    console.log(`[migrate] applying ${version} (${sql.length} chars)`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version) VALUES($1)", [version]);
      await client.query("COMMIT");
      console.log(`[migrate] ok ${version}`);
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(`[migrate] FAILED ${version}:`, e);
      process.exit(1);
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
