import "server-only";

import { createHash, createHmac, randomBytes, randomInt, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function generateOtp() {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(challengeId: string, otp: string) {
  const pepper = process.env.OTP_PEPPER ?? process.env.SESSION_SECRET;
  if (!pepper && process.env.NODE_ENV === "production") {
    throw new Error("OTP_PEPPER is required in production.");
  }
  return createHmac("sha256", pepper ?? "crave-development-only-pepper")
    .update(`${challengeId}:${otp}`)
    .digest("hex");
}

export function verifyOtp(challengeId: string, otp: string, expectedHex: string) {
  const actual = Buffer.from(hashOtp(challengeId, otp), "hex");
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(pin, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPin(pin: string, encoded: string) {
  const [algorithm, salt, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(pin, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
