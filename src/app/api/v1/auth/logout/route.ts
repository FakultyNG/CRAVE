import { handleApiError } from "@/lib/api";
import { endSession } from "@/lib/auth/session";

export async function POST() {
  try {
    await endSession();
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
