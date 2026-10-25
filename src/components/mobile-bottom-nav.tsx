"use client";

import Link from "next/link";
import { Compass, House, ReceiptText, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [{ label: "Home", href: "/", icon: House }, { label: "Explore", href: "/menu", icon: Compass }, { label: "Orders", href: "/orders", icon: ReceiptText }, { label: "Account", href: "/account", icon: UserRound }];

export function MobileBottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login") || pathname.startsWith("/admin") || pathname.startsWith("/owner")) return null;
  return <nav aria-label="Primary" className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-[1.4rem] border border-white/60 bg-crave-ink/95 p-1.5 text-white shadow-2xl backdrop-blur md:hidden">{items.map(({ label, href, icon: Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <Link key={href} href={href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1rem] text-[10px] font-semibold", active && "bg-crave-orange")}><Icon size={18} /><span>{label}</span></Link>; })}</nav>;
}
