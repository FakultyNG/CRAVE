import "server-only";
import type { CheckoutRequest, CheckoutResult, PaymentCheck } from "./types";
import { checkStrowalletPayment, createStrowalletCheckout } from "./strowallet";

export function paymentProvider() {
  const configured = process.env.PAYMENT_PROVIDER?.toLowerCase();
  if (process.env.NODE_ENV === "production" && configured === "mock") throw new Error("Mock payments are disabled in production.");
  return configured === "mock" ? "MOCK" as const : "STROWALLET" as const;
}

export async function createCheckout(input: CheckoutRequest): Promise<CheckoutResult> {
  if (paymentProvider() === "STROWALLET") return createStrowalletCheckout(input);
  const checkoutUrl = new URL(input.successUrl);
  checkoutUrl.searchParams.set("mock", "success");
  return { reference: input.reference, checkoutUrl: checkoutUrl.toString(), raw: { development: true, status: "pending" } };
}

export async function checkPayment(reference: string): Promise<PaymentCheck> {
  if (paymentProvider() === "STROWALLET") return checkStrowalletPayment(reference);
  return { reference, status: "paid", amountKobo: undefined, currency: "NGN", raw: { development: true, status: "paid" } };
}
