import "server-only";
import { requestStrowalletTransfer, verifyStrowalletTransfer } from "./strowallet";

export function payoutProvider() {
  const configured = process.env.PAYOUT_PROVIDER?.toLowerCase();
  if (process.env.NODE_ENV === "production" && configured === "mock") throw new Error("Mock payouts are disabled in production.");
  return configured === "mock" ? "MOCK" as const : "STROWALLET" as const;
}

export async function requestTransfer(input: Parameters<typeof requestStrowalletTransfer>[0]) {
  if (payoutProvider() === "STROWALLET") return requestStrowalletTransfer(input);
  const merchantReference = `MOCK-${crypto.randomUUID()}`;
  return { merchantReference, sessionId: `mock-${Date.now()}`, raw: { development: true, status: "processing", merchantTxRef: merchantReference } };
}

export async function verifyTransfer(reference: string) {
  if (payoutProvider() === "STROWALLET") return verifyStrowalletTransfer(reference);
  return { status: "PAID" as const, sessionId: `mock-${Date.now()}`, raw: { development: true, status: "success", merchantTxRef: reference } };
}
