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

  const { rows } = await client.query(`SELECT to_regclass('public."Product"') AS "productTable"`);
  if (rows[0]?.productTable) {
    throw new Error("Guarded reset refused because the Product table already exists.");
  }

  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  await client.query(migrationSql);
  await client.query("COMMIT");
  console.log("The incomplete database was reset and the initial schema was applied successfully.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error("Database reset failed with PostgreSQL code", typeof error === "object" && error !== null && "code" in error ? error.code : "UNKNOWN");
  throw error;
} finally {
  await client.end();
}
