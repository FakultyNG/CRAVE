"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { useCart } from "./cart-provider";
import { formatNaira } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog";

export function AddToCart({ product }: { product: CatalogProduct }) {
  const [variant, setVariant] = useState(product.variants[0].name);
  const [options, setOptions] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");
  const [error, setError] = useState("");
  const { add } = useCart();
  const price = product.basePriceKobo + (product.variants.find((item) => item.name === variant)?.priceDeltaKobo ?? 0) + product.options.filter((item) => options.includes(item.name)).reduce((sum, item) => sum + item.priceKobo, 0);

  async function submit() {
    setError(""); setState("adding");
    try { await add({ productSlug: product.slug, variantName: variant, optionNames: options, quantity }); setState("added"); setTimeout(() => setState("idle"), 1800); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add this item."); setState("idle"); }
  }

  return <div className="space-y-8">
    <fieldset><legend className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-crave-muted">Choose a size</legend><div className="grid gap-2 sm:grid-cols-2">{product.variants.map((item) => <label key={item.name} className="flex cursor-pointer items-center justify-between rounded-2xl border border-black/10 bg-white p-4 has-checked:border-crave-red has-checked:ring-1 has-checked:ring-crave-red"><span className="font-semibold">{item.name}</span><span className="text-sm text-crave-muted">{item.priceDeltaKobo ? `+${formatNaira(item.priceDeltaKobo)}` : "Included"}</span><input className="sr-only" type="radio" name="variant" value={item.name} checked={variant === item.name} onChange={() => setVariant(item.name)} /></label>)}</div></fieldset>
    <fieldset><legend className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-crave-muted">{product.optionGroup}</legend><div className="grid gap-2">{product.options.map((item) => <label key={item.name} className="flex cursor-pointer items-center justify-between rounded-2xl border border-black/10 bg-white p-4 has-checked:border-crave-orange"><span className="font-semibold">{item.name}</span><span className="text-sm text-crave-muted">{item.priceKobo ? `+${formatNaira(item.priceKobo)}` : "Included"}</span><input className="size-4 accent-crave-orange" type="checkbox" checked={options.includes(item.name)} onChange={() => setOptions((current) => current.includes(item.name) ? current.filter((name) => name !== item.name) : [...current, item.name])} /></label>)}</div></fieldset>
    <div className="flex flex-wrap items-center gap-4"><div className="flex items-center rounded-full border border-black/10 bg-white p-1"><button aria-label="Decrease quantity" className="grid size-10 place-items-center rounded-full hover:bg-black/5" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={16} /></button><span className="w-8 text-center font-bold">{quantity}</span><button aria-label="Increase quantity" className="grid size-10 place-items-center rounded-full hover:bg-black/5" onClick={() => setQuantity((value) => Math.min(20, value + 1))}><Plus size={16} /></button></div><Button className="grow" disabled={state === "adding"} onClick={submit}>{state === "added" ? <><Check size={17} /> Added to cart</> : state === "adding" ? "Adding…" : `Add · ${formatNaira(price * quantity)}`}</Button></div>
    {error && <p role="alert" className="text-sm font-semibold text-crave-red">{error}</p>}
  </div>;
}
