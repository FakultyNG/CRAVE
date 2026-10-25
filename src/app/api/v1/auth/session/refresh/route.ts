import { cookies } from "next/headers";
import { handleApiError, jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export async function POST() {
  try {
    const session = await getSession({ renew: true });
    if (!session) {
      (await cookies()).delete(SESSION_COOKIE);
      return jsonError("Session expired.", 401);
    }
    return Response.json({ data: { expiresInHours: 120 } });
  } catch (error) {
    return handleApiError(error);
  }
}
