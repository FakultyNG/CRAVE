export type CheckoutRequest = { reference: string; amountKobo: number; currency: "NGN"; description: string; customerName: string; customerEmail: string; callbackUrl: string; successUrl: string; cancelUrl: string };
export type CheckoutResult = { reference: string; checkoutUrl: string; raw: unknown };
export type PaymentCheck = { reference: string; status: "pending" | "paid" | "failed" | "cancelled"; amountKobo?: number; currency?: string; raw: unknown };
