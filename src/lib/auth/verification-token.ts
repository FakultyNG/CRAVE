import "server-only";

import { SignJWT, jwtVerify } from "jose";
import type { OtpPurpose } from "@/generated/prisma/client";

type VerificationPayload = {
  challengeId: string;
  phone: string;
  purpose: OtpPurpose;
};

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required.");
  return new TextEncoder().encode(secret ?? "crave-development-session-secret-change-me");
}

export async function createVerificationToken(payload: VerificationPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setAudience("crave-auth")
    .setIssuer("crave")
    .sign(key());
}

export async function readVerificationToken(token: string): Promise<VerificationPayload> {
  const { payload } = await jwtVerify(token, key(), { audience: "crave-auth", issuer: "crave" });
  if (!payload.challengeId || !payload.phone || !payload.purpose) throw new Error("Invalid verification token.");
  return payload as unknown as VerificationPayload;
}
