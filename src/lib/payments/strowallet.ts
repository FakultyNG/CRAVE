import "server-only";
import type { CheckoutRequest, CheckoutResult, PaymentCheck } from "./types";

function publicKey() {
  const key = process.env.STROWALLET_PUBLIC_KEY;
  if (!key) throw new Error("STROWALLET_PUBLIC_KEY is required for live payments.");
  return key;
}

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function firstString(source: Record<string, unknown>, keys: string[]) { for (const key of keys) if (typeof source[key] === "string" && source[key]) return source[key] as string; }
function providerData(raw: unknown) { const root = record(raw); return { root, data: record(root.data) }; }

export function normalizePaymentStatus(value: unknown): PaymentCheck["status"] {
  const status = String(value ?? "").toLowerCase().replaceAll("_", " ");
  if (["success", "successful", "paid", "completed", "complete"].includes(status)) return "paid";
  if (["failed", "failure", "declined", "rejected"].includes(status)) return "failed";
  if (["cancelled", "canceled", "abandoned"].includes(status)) return "cancelled";
  return "pending";
}

export async function createStrowalletCheckout(input: CheckoutRequest): Promise<CheckoutResult> {
  const url = new URL("/pay/", process.env.STROWALLET_PAYMENT_BASE_URL ?? "https://strowallet.com");
  url.search = new URLSearchParams({ public_key: publicKey(), amount: (input.amountKobo / 100).toFixed(2), currency: input.currency, description: input.description, customer_name: input.customerName, customer_email: input.customerEmail, callback_url: input.callbackUrl, success_url: input.successUrl, cancel_url: input.cancelUrl }).toString();
  const response = await fetch(url, { method: "POST", headers: { accept: "application/json" }, cache: "no-store" });
  const raw: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Strowallet checkout failed (${response.status}).`);
  const { root, data } = providerData(raw);
  const checkoutUrl = firstString(data, ["checkout_url", "payment_url", "url", "link"]) ?? firstString(root, ["checkout_url", "payment_url", "url", "link"]);
  const reference = firstString(data, ["reference", "transaction_reference", "ref"]) ?? firstString(root, ["reference", "transaction_reference", "ref"]) ?? input.reference;
  if (!checkoutUrl) throw new Error("Strowallet did not return a checkout URL.");
  return { reference, checkoutUrl, raw };
}

export async function checkStrowalletPayment(reference: string): Promise<PaymentCheck> {
  const url = new URL("/api/checkout/status/", process.env.STROWALLET_PAYMENT_BASE_URL ?? "https://strowallet.com");
  url.search = new URLSearchParams({ public_key: publicKey(), reference }).toString();
  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  const raw: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Strowallet verification failed (${response.status}).`);
  const { root, data } = providerData(raw);
  const amount = data.amount ?? root.amount;
  const parsedAmount = typeof amount === "number" || typeof amount === "string" ? Math.round(Number(amount) * 100) : undefined;
  return { reference, status: normalizePaymentStatus(data.status ?? root.status), amountKobo: Number.isFinite(parsedAmount) ? parsedAmount : undefined, currency: firstString(data, ["currency"]) ?? firstString(root, ["currency"]), raw };
}
