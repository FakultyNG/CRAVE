import { Suspense } from "react";
import { PaymentResult } from "@/components/payment-result";

export const metadata = { title: "Payment result" };
export default function PaymentResultPage() { return <Suspense fallback={<main className="grid min-h-svh place-items-center text-crave-muted">Confirming payment…</main>}><PaymentResult /></Suspense>; }
