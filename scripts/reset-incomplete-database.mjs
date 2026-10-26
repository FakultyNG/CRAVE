import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const migrationUrl = new URL("../prisma/migrations/20261025000000_initial/migration.sql", import.meta.url);
const migrationSql = await readFile(migrationUrl, "utf8");
const client = new pg.Client({ connectionString });

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('crave-incomplete-schema-reset'))");
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS crave_control;
    CREATE TABLE IF NOT EXISTS crave_control.completed_action (
      action_key TEXT PRIMARY KEY,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const actionKey = "approved-incomplete-schema-reset-2026-10-26";
  const { rowCount } = await client.query("SELECT 1 FROM crave_control.completed_action WHERE action_key = $1", [actionKey]);
  if (rowCount) {
    throw new Error("The approved one-time database reset has already completed.");
  }

  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  await client.query(migrationSql);
  await client.query("INSERT INTO crave_control.completed_action (action_key) VALUES ($1)", [actionKey]);
  await client.query("COMMIT");
  console.log("The incomplete database was reset and the initial schema was applied successfully.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error("Database reset failed with PostgreSQL code", typeof error === "object" && error !== null && "code" in error ? error.code : "UNKNOWN");
  throw error;
} finally {
  await client.end();
}
