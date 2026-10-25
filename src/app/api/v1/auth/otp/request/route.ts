import { getDb } from "@/lib/db";
import { handleApiError, jsonError, requestIp } from "@/lib/api";
import { generateOtp, hashOtp } from "@/lib/auth/crypto";
import { OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from "@/lib/auth/constants";
import { deliverOtp } from "@/lib/auth/strowallet";
import { requestOtpSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    const input = requestOtpSchema.parse(await request.json());
    const db = getDb();
    const ip = requestIp(request);
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const [recentForPhone, recentForIp, existingUser] = await Promise.all([
      db.otpChallenge.count({ where: { phone: input.phone, createdAt: { gte: since } } }),
      ip ? db.otpChallenge.count({ where: { requestIp: ip, createdAt: { gte: since } } }) : 0,
      db.user.findUnique({ where: { phone: input.phone }, select: { id: true } }),
    ]);

    if (recentForPhone >= 3 || recentForIp >= 10) {
      return jsonError("Too many code requests. Please wait 15 minutes and try again.", 429);
    }
    if (input.purpose === "REGISTRATION" && existingUser) {
      return jsonError("This phone number already has an account. Sign in with your PIN.", 409);
    }
    if (input.purpose === "PIN_RESET" && !existingUser) {
      return jsonError("We could not find an account for this phone number.", 404);
    }

    const challenge = await db.otpChallenge.create({
      data: {
        phone: input.phone,
        preferredName: input.preferredName,
        channel: input.channel,
        purpose: input.purpose,
        otpHash: "pending",
        maxAttempts: OTP_MAX_ATTEMPTS,
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
        requestIp: ip,
      },
    });
    const otp = generateOtp();
    await db.otpChallenge.update({ where: { id: challenge.id }, data: { otpHash: hashOtp(challenge.id, otp) } });

    try {
      const delivery = await deliverOtp(input.channel, input.phone, otp);
      return Response.json({
        data: {
          challengeId: challenge.id,
          expiresInSeconds: OTP_TTL_MINUTES * 60,
          channel: input.channel,
          ...(delivery.testOtp ? { testOtp: delivery.testOtp, developmentMode: true } : {}),
        },
      }, { status: 201 });
    } catch (error) {
      await db.otpChallenge.delete({ where: { id: challenge.id } });
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
