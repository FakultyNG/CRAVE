import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  const { rows } = await client.query(`SELECT to_regclass('public."Product"') AS "productTable"`);
  if (rows[0]?.productTable) {
    throw new Error("Guarded reset refused because the Product table already exists.");
  }
  console.log("The core Product table is missing; the approved one-time database reset is permitted.");
} finally {
  await client.end();
}
