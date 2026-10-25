import { connection } from "next/server";
import { cookies } from "next/headers";
import { handleApiError, jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export async function GET() {
  await connection();
  try {
    const session = await getSession({ renew: true });
    if (!session) {
      (await cookies()).delete(SESSION_COOKIE);
      return jsonError("Authentication required.", 401);
    }
    return Response.json({ data: { user: session.user } });
  } catch (error) {
    return handleApiError(error);
  }
}
