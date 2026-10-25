"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign } from "lucide-react";

type Source = "PREFUNDED_CAPITAL" | "GROSS_REVENUE";
export function PayrollFundingSwitch() {
  const [source, setSource] = useState<Source | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; fetch("/api/v1/admin/payroll-settings").then(async (response) => { if (response.status === 403) return null; const body = await response.json(); if (!response.ok) throw new Error(body.error?.message); if (active) setSource(body.source); return body; }).catch((reason) => { if (active) setError(reason.message); }); return () => { active = false; }; }, []);
  async function change(next: Source) { setBusy(true); setError(""); try { const response = await fetch("/api/v1/admin/payroll-settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ source: next }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error?.message); setSource(body.source); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not change payroll funding."); } finally { setBusy(false); } }
  if (!source) return error ? <p className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-crave-red">{error}</p> : null;
  return <section className="mb-7 rounded-[1.7rem] bg-white p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="flex gap-3"><CircleDollarSign className="mt-0.5 text-crave-orange" /><div><h2 className="font-bold">Salary funding source</h2><p className="max-w-2xl text-sm text-crave-muted">Prefunded capital is the default and never debits gross revenue. Switching to gross revenue affects future salary credits only and records a matching gross-revenue debit.</p></div></div><div className="flex rounded-full bg-crave-cream p-1"><button disabled={busy} onClick={() => void change("PREFUNDED_CAPITAL")} className={`rounded-full px-4 py-2 text-xs font-bold ${source === "PREFUNDED_CAPITAL" ? "bg-crave-ink text-white" : "text-crave-ink"}`}>Prefunded capital</button><button disabled={busy} onClick={() => void change("GROSS_REVENUE")} className={`rounded-full px-4 py-2 text-xs font-bold ${source === "GROSS_REVENUE" ? "bg-crave-red text-white" : "text-crave-ink"}`}>Gross revenue</button></div></div>{error && <p className="mt-3 text-sm text-crave-red">{error}</p>}</section>;
}
