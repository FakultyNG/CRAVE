import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { PIN_LOCK_MINUTES, PIN_MAX_ATTEMPTS } from "@/lib/auth/constants";
import { verifyPin } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const db = getDb();
    const user = await db.user.findUnique({ where: { phone: input.phone } });
    const genericError = "Phone number or PIN is incorrect.";
    if (!user?.pinHash || user.status !== "ACTIVE") return jsonError(genericError, 401);
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      return jsonError("Too many attempts. Try again later or reset your PIN.", 429);
    }

    if (!(await verifyPin(input.pin, user.pinHash))) {
      const attempts = user.failedPinAttempts + 1;
      await db.user.update({
        where: { id: user.id },
        data: {
          failedPinAttempts: attempts >= PIN_MAX_ATTEMPTS ? 0 : attempts,
          pinLockedUntil: attempts >= PIN_MAX_ATTEMPTS ? new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000) : null,
        },
      });
      return jsonError(genericError, 401);
    }

    await db.user.update({ where: { id: user.id }, data: { failedPinAttempts: 0, pinLockedUntil: null, lastLoginAt: new Date() } });
    await createSession(user.id);
    return Response.json({ data: { user: { id: user.id, preferredName: user.preferredName } } });
  } catch (error) {
    return handleApiError(error);
  }
}
