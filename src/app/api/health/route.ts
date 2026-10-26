import { getDb } from "@/lib/db";
import { connection } from "next/server";

const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  try {
    await connection();
    await getDb().product.count();
    return Response.json({
      status: "ok",
      database: "ready",
      schema: "ready",
      otpProvider: process.env.STROWALLET_PUBLIC_KEY ? "configured" : "unconfigured",
    }, { headers });
  } catch (error) {
    const databaseErrorCode = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : "UNKNOWN";
    console.error("Health check failed", error);
    return Response.json({
      status: "unavailable",
      database: "unavailable",
      schema: "unavailable",
      databaseErrorCode,
      otpProvider: process.env.STROWALLET_PUBLIC_KEY ? "configured" : "unconfigured",
    }, { status: 503, headers });
  }
}
