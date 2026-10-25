import { getDb } from "@/lib/db";
import { connection } from "next/server";

const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  try {
    await connection();
    await getDb().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ready" }, { headers });
  } catch {
    return Response.json({ status: "unavailable", database: "unavailable" }, { status: 503, headers });
  }
}
