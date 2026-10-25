"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatNaira } from "@/lib/utils";

type Data = { metrics: { revenueKobo: number; paidOrders: number; activeOrders: number; averageOrderKobo: number; customers: number; activeProducts: number }; recent: { id: string; orderNumber: string; customerName: string; status: string; totalKobo: number }[] };
export function AdminOverview() {
  const [data, setData] = useState<Data | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; fetch("/api/v1/admin/overview").then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message); if (active) setData(body); }).catch((reason) => { if (active) setError(reason.message); }); return () => { active = false; }; }, []);
  if (error) return <p className="rounded-2xl bg-white p-6 text-crave-red">{error}</p>; if (!data) return <p className="text-crave-muted">Loading operations…</p>;
  const metrics = [["Today’s revenue", formatNaira(data.metrics.revenueKobo)], ["Paid today", data.metrics.paidOrders], ["Active orders", data.metrics.activeOrders], ["Average order", formatNaira(data.metrics.averageOrderKobo)], ["Customers", data.metrics.customers], ["Live products", data.metrics.activeProducts]];
  return <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value], index) => <div key={label} className={`min-h-40 rounded-[1.7rem] p-6 ${index === 0 ? "bg-crave-red text-white" : "bg-white"}`}><p className={`text-sm ${index === 0 ? "text-white/65" : "text-crave-muted"}`}>{label}</p><p className="mt-12 text-3xl font-bold">{value}</p></div>)}</div><section className="mt-8 rounded-[2rem] bg-white p-6 sm:p-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Recent orders</h2><Link href="/admin/orders" className="flex items-center gap-2 text-sm font-bold">Open board <ArrowUpRight size={16} /></Link></div><div className="mt-6 divide-y divide-black/8">{data.recent.map((order) => <Link href="/admin/orders" key={order.id} className="flex items-center justify-between gap-4 py-4"><div><strong>{order.orderNumber}</strong><p className="text-sm text-crave-muted">{order.customerName} · {order.status.toLowerCase().replaceAll("_", " ")}</p></div><strong>{formatNaira(order.totalKobo)}</strong></Link>)}</div></section></>;
}
