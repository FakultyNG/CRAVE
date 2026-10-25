import "server-only";

import type { OtpChannel } from "@/generated/prisma/client";

type DeliveryResult = { provider: "strowallet" | "development"; testOtp?: string };

export async function deliverOtp(channel: OtpChannel, phone: string, otp: string): Promise<DeliveryResult> {
  const publicKey = process.env.STROWALLET_PUBLIC_KEY;
  const mockEnabled = process.env.AUTH_MOCK_OTP === "true" && process.env.NODE_ENV !== "production";

  if (!publicKey) {
    if (mockEnabled) return { provider: "development", testOtp: otp };
    throw new Error("OTP delivery is not configured.");
  }

  const baseUrl = (process.env.STROWALLET_BASE_URL ?? "https://strowallet.com/api").replace(/\/$/, "");
  const endpoint = channel === "SMS" ? "Otp-sms" : "whatsapp-otp";
  const query = new URLSearchParams({ public_key: publicKey, phone, otp });
  const response = await fetch(`${baseUrl}/${endpoint}/?${query}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`OTP provider rejected the request (${response.status}).`);
  }

  return { provider: "strowallet" };
}
