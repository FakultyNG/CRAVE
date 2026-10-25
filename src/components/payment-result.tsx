"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { useCart } from "./cart-provider";

type Result = { paymentStatus: string; order?: { id: string; orderNumber: string; status: string } };

export function PaymentResult() {
  const search = useSearchParams();
  const reference = search.get("reference") ?? search.get("transaction_reference") ?? search.get("ref");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const { refresh } = useCart();
  useEffect(() => {
    if (!reference) return;
    let attempts = 0; let timer: ReturnType<typeof setTimeout>;
    async function verify() {
      try { const response = await fetch(`/api/v1/payments/${encodeURIComponent(reference!)}/status`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error?.message); setResult(body); if (body.paymentStatus === "PAID") { await refresh(); return; } if (["FAILED", "CANCELLED"].includes(body.paymentStatus)) return; if (++attempts < 8) timer = setTimeout(verify, 3000); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "Could not verify payment."); }
    }
    void verify(); return () => clearTimeout(timer);
  }, [reference, refresh]);
  const displayError = !reference ? "No payment reference was returned." : error;
  const paid = result?.paymentStatus === "PAID";
  const terminalFailure = result && ["FAILED", "CANCELLED"].includes(result.paymentStatus);
  return <div className="mx-auto flex min-h-svh max-w-xl items-center px-5 py-16"><section className="w-full rounded-[2.5rem] bg-white p-8 text-center shadow-[0_20px_70px_rgba(70,34,20,.1)] sm:p-12">{paid ? <CheckCircle2 className="mx-auto text-[#5f7d3b]" size={54} /> : terminalFailure || displayError ? <XCircle className="mx-auto text-crave-red" size={54} /> : <LoaderCircle className="mx-auto animate-spin text-crave-orange" size={54} />}<p className="mt-6 text-xs font-bold uppercase tracking-[.22em] text-crave-red">{paid ? "Payment confirmed" : terminalFailure ? "Payment not completed" : displayError ? "We hit a snag" : "Confirming securely"}</p><h1 className="mt-3 text-4xl font-extrabold">{paid ? "Your craving is in motion." : terminalFailure ? "Let’s try that again." : displayError ? "We couldn’t verify yet." : "Just a tiny moment."}</h1><p className="mt-4 leading-7 text-crave-muted">{paid ? `Order ${result?.order?.orderNumber} has been received by Crave.` : terminalFailure ? "No charge has been confirmed. You can return to your cart and restart payment." : displayError || "We’re checking the payment directly with Strowallet. Please keep this page open."}</p>{paid && result?.order ? <Link href={`/orders/${result.order.id}`} className="mt-7 inline-flex min-h-12 items-center rounded-full bg-crave-orange px-7 font-bold text-white">Track your order</Link> : terminalFailure || displayError ? <Link href="/cart" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-crave-orange px-7 font-bold text-white"><RotateCcw size={17} /> Return to cart</Link> : null}</section></div>;
}
