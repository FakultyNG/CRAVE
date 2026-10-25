import { getDb } from "@/lib/db";
import { firstSalaryDueAt } from "@/lib/finance/calendar";
import { handleApiError, jsonError } from "@/lib/api";
import { hashPin, randomToken } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { completeRegistrationSchema } from "@/lib/auth/validation";
import { readVerificationToken } from "@/lib/auth/verification-token";

export async function POST(request: Request) {
  try {
    const input = completeRegistrationSchema.parse(await request.json());
    const payload = await readVerificationToken(input.verificationToken);
    if (payload.purpose !== "REGISTRATION") return jsonError("This verification cannot create an account.", 400);
    const db = getDb();
    const challenge = await db.otpChallenge.findUnique({ where: { id: payload.challengeId } });
    if (!challenge?.verifiedAt || challenge.consumedAt || challenge.phone !== payload.phone) {
      return jsonError("Verification has expired or was already used.", 400);
    }

    const pinHash = await hashPin(input.pin);
    const user = await db.$transaction(async (transaction) => {
      const invitation = await transaction.invitation.findFirst({ where: { phone: challenge.phone, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
      const existingOwner = await transaction.user.findUnique({ where: { phone: challenge.phone }, include: { ownerProfile: true } });
      if (existingOwner && (!existingOwner.ownerProfile || existingOwner.pinHash)) throw new Error("An account already exists for this phone number.");
      const referrer = input.referralCode ? await transaction.user.findUnique({ where: { referralCode: input.referralCode } }) : null;
      if (input.referralCode && !referrer) throw new Error("That referral code is not valid.");
      const userData = {
          preferredName: challenge.preferredName!,
          phoneVerifiedAt: new Date(),
          pinHash,
      };
      const created = existingOwner ? await transaction.user.update({ where: { id: existingOwner.id }, data: userData }) : await transaction.user.create({ data: { ...userData, phone: challenge.phone, referralCode: `CRV${randomToken(5).toUpperCase()}`, referredById: referrer?.id, staffProfile: invitation ? { create: { roleId: invitation.roleId, locationId: invitation.locationId, salaryKobo: invitation.salaryKobo, nextSalaryAt: firstSalaryDueAt(), status: "ACTIVE" } } : undefined } });
      if (referrer && !invitation && !existingOwner) await transaction.referral.create({ data: { referrerId: referrer.id, referredUserId: created.id } });
      if (invitation) await transaction.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      await transaction.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      await transaction.auditLog.create({
        data: { actorUserId: created.id, action: "auth.register", entityType: "User", entityId: created.id },
      });
      return created;
    });
    await createSession(user.id);
    return Response.json({ data: { user: { id: user.id, preferredName: user.preferredName } } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
