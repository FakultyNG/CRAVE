import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { verifyOtp } from "@/lib/auth/crypto";
import { verifyOtpSchema } from "@/lib/auth/validation";
import { createVerificationToken } from "@/lib/auth/verification-token";

export async function POST(request: Request) {
  try {
    const input = verifyOtpSchema.parse(await request.json());
    const db = getDb();
    const challenge = await db.otpChallenge.findUnique({ where: { id: input.challengeId } });
    if (!challenge || challenge.consumedAt) return jsonError("This code is no longer valid.", 400);
    if (challenge.expiresAt <= new Date()) return jsonError("This code has expired. Request a new one.", 400);
    if (challenge.attempts >= challenge.maxAttempts) return jsonError("Too many incorrect attempts. Request a new code.", 429);

    if (!verifyOtp(challenge.id, input.otp, challenge.otpHash)) {
      await db.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return jsonError("That code is not correct.", 400);
    }

    await db.otpChallenge.update({ where: { id: challenge.id }, data: { verifiedAt: new Date() } });
    const verificationToken = await createVerificationToken({
      challengeId: challenge.id,
      phone: challenge.phone,
      purpose: challenge.purpose,
    });
    return Response.json({ data: { verificationToken, purpose: challenge.purpose } });
  } catch (error) {
    return handleApiError(error);
  }
}
