"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { formatNaira } from "@/lib/utils";

type Favourite = { slug: string; name: string; priceKobo: number; image: string };
export function FavouritesGrid() {
  const [items, setItems] = useState<Favourite[] | null>(null); const [error, setError] = useState("");
  useEffect(() => { fetch("/api/v1/customers/me/favourites").then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message); setItems(body.favourites); }).catch((reason) => setError(reason.message)); }, []);
  if (error) return <p className="text-crave-red">{error}</p>; if (!items) return <p className="text-crave-muted">Loading favourites…</p>;
  if (!items.length) return <div className="rounded-[2rem] bg-white p-10 text-center"><Heart className="mx-auto text-crave-orange" /><h2 className="mt-4 text-2xl font-bold">Nothing saved yet.</h2><Link href="/menu" className="mt-4 inline-block font-bold text-crave-red">Find a favourite</Link></div>;
  return <div className="grid gap-4 sm:grid-cols-2">{items.map((item) => <Link href={`/menu/${item.slug}`} key={item.slug} className="overflow-hidden rounded-[2rem] bg-white"><div className="relative aspect-[5/4]"><Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" /></div><div className="flex items-center justify-between p-5"><h2 className="text-xl font-bold">{item.name}</h2><strong>{formatNaira(item.priceKobo)}</strong></div></Link>)}</div>;
}
