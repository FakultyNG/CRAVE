"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ReceiptText } from "lucide-react";
import { formatNaira } from "@/lib/utils";

type Order = { id: string; orderNumber: string; status: string; fulfillmentType: string; totalKobo: number; createdAt: string; items: { productName: string; quantity: number }[] };
const pretty = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

export function OrderList() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/v1/orders", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message); setOrders(body.orders); }).catch((reason) => setError(reason.message)); }, []);
  if (error) return <p className="mt-10 text-crave-red">{error}</p>;
  if (!orders) return <p className="mt-10 text-crave-muted">Finding your orders…</p>;
  if (!orders.length) return <div className="mt-10 rounded-[2rem] bg-white p-10 text-center"><ReceiptText className="mx-auto text-crave-orange" size={38} /><h2 className="mt-5 text-2xl font-bold">No orders here yet.</h2><p className="mt-2 text-crave-muted">Your next delicious decision will appear here.</p><Link href="/menu" className="mt-6 inline-block rounded-full bg-crave-orange px-6 py-3 font-bold text-white">Explore menu</Link></div>;
  return <div className="mt-10 grid gap-3">{orders.map((order) => <Link key={order.id} href={`/orders/${order.id}`} className="group flex items-center justify-between gap-5 rounded-[1.7rem] bg-white p-5 sm:p-7"><div><div className="flex flex-wrap items-center gap-3"><h2 className="font-bold">{order.orderNumber}</h2><span className="rounded-full bg-crave-cream px-3 py-1 text-[10px] font-bold uppercase tracking-wide">{pretty(order.status)}</span></div><p className="mt-2 text-sm text-crave-muted">{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(" · ")}</p><p className="mt-2 text-xs text-crave-muted">{new Date(order.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })} · {pretty(order.fulfillmentType)}</p></div><div className="flex items-center gap-4"><strong>{formatNaira(order.totalKobo)}</strong><ArrowUpRight className="transition group-hover:rotate-45" /></div></Link>)}</div>;
}
