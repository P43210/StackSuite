import fs from "node:fs";
import path from "node:path";
import { getPool } from "./pool";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function runMigrations() {
  const pool = getPool();
  if (!pool) {
    console.log("[migrate] DATABASE_URL not set, skipping migrations.");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // filenames are prefixed 001_, 002_, ... so lexical sort = correct order

  const { rows } = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] skipping ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    console.log(`[migrate] applying ${file}...`);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`[migrate] applied ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrate] failed on ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log("[migrate] up to date.");
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate] migration run failed:", err);
    process.exit(1);
  });
