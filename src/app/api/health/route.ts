import { getDb } from "@/lib/db";
import { connection } from "next/server";

const headers = { "Cache-Control": "no-store, max-age=0" };

function errorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) return "UNKNOWN";
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("cause" in error) return errorCode(error.cause);
  return "UNKNOWN";
}

export async function GET() {
  try {
    await connection();
    await getDb().product.count();
    return Response.json({
      status: "ok",
      database: "ready",
      schema: "ready",
      otpProvider: process.env.STROWALLET_PUBLIC_KEY ? "configured" : "unconfigured",
      release: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    }, { headers });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({
      status: "unavailable",
      database: "unavailable",
      schema: "unavailable",
      databaseErrorCode: errorCode(error),
      otpProvider: process.env.STROWALLET_PUBLIC_KEY ? "configured" : "unconfigured",
      release: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    }, { status: 503, headers });
  }
}
