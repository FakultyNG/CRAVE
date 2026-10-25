"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export function FavouriteButton({ productSlug }: { productSlug: string }) {
  const [saved, setSaved] = useState(false); const [busy, setBusy] = useState(false); const router = useRouter();
  async function toggle() { setBusy(true); const response = await fetch("/api/v1/customers/me/favourites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productSlug }) }); if (response.status === 401) { router.push("/login"); return; } const body = await response.json(); setSaved(body.favourite); setBusy(false); }
  return <button onClick={toggle} disabled={busy} aria-pressed={saved} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold"><Heart size={17} fill={saved ? "currentColor" : "none"} className={saved ? "text-crave-red" : ""} /> {saved ? "Saved" : "Save"}</button>;
}
