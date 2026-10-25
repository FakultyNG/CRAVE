"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartPayload = { id: string | null; itemCount: number; subtotalKobo: number; items: Array<{ id: string; quantity: number; product: { slug: string; name: string; image: string }; variant: string | null; options: string[]; unitPriceKobo: number; lineTotalKobo: number }> };

type CartContextValue = CartPayload & { loading: boolean; refresh: () => Promise<void>; add: (input: { productSlug: string; variantName?: string; optionNames: string[]; quantity: number }) => Promise<void>; update: (id: string, quantity: number) => Promise<void>; remove: (id: string) => Promise<void> };
const emptyCart: CartPayload = { id: null, itemCount: 0, subtotalKobo: 0, items: [] };
const CartContext = createContext<CartContextValue | null>(null);

async function cartRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Cart request failed.");
  return payload as CartPayload;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartPayload>(emptyCart);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { try { setCart(await cartRequest("/api/v1/cart")); } finally { setLoading(false); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const value = useMemo<CartContextValue>(() => ({ ...cart, loading, refresh, add: async (input) => setCart(await cartRequest("/api/v1/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })), update: async (id, quantity) => setCart(await cartRequest(`/api/v1/cart/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity }) })), remove: async (id) => setCart(await cartRequest(`/api/v1/cart/${id}`, { method: "DELETE" })) }), [cart, loading, refresh]);
  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
