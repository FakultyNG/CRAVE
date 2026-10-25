import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { hashPin } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { completeRegistrationSchema } from "@/lib/auth/validation";
import { readVerificationToken } from "@/lib/auth/verification-token";

export async function POST(request: Request) {
  try {
    const input = completeRegistrationSchema.parse(await request.json());
    const payload = await readVerificationToken(input.verificationToken);
    if (payload.purpose !== "PIN_RESET") return jsonError("This verification cannot reset a PIN.", 400);
    const db = getDb();
    const challenge = await db.otpChallenge.findUnique({ where: { id: payload.challengeId } });
    if (!challenge?.verifiedAt || challenge.consumedAt || challenge.phone !== payload.phone) {
      return jsonError("Verification has expired or was already used.", 400);
    }
    const pinHash = await hashPin(input.pin);
    const user = await db.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { phone: payload.phone },
        data: { pinHash, failedPinAttempts: 0, pinLockedUntil: null },
      });
      await transaction.session.updateMany({ where: { userId: updated.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await transaction.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      await transaction.auditLog.create({
        data: { actorUserId: updated.id, action: "auth.pin_reset", entityType: "User", entityId: updated.id },
      });
      return updated;
    });
    await createSession(user.id);
    return Response.json({ data: { user: { id: user.id, preferredName: user.preferredName } } });
  } catch (error) {
    return handleApiError(error);
  }
}
