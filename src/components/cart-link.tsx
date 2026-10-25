"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";

export function CartLink() {
  const { itemCount } = useCart();
  return <Link href="/cart" aria-label={`Cart with ${itemCount} items`} className="relative grid size-10 place-items-center rounded-full hover:bg-black/5"><ShoppingBag size={19} />{itemCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-crave-orange px-1 text-[10px] font-bold leading-5 text-white">{itemCount}</span>}</Link>;
}
