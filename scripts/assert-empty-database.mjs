import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  const { rows: tables } = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `);

  for (const { tablename } of tables) {
    const quotedTable = `"${String(tablename).replaceAll('"', '""')}"`;
    const { rows } = await client.query(`SELECT EXISTS (SELECT 1 FROM ${quotedTable} LIMIT 1) AS "hasRows"`);
    if (rows[0]?.hasRows) {
      throw new Error(`Database repair stopped because table ${quotedTable} contains data.`);
    }
  }

  console.log(`Database contains no application data across ${tables.length} existing table(s); guarded schema repair is permitted.`);
} finally {
  await client.end();
}
