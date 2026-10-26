"use client";

import Link from "next/link";
import { Compass, House, ReceiptText, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [{ label: "Home", href: "/", icon: House }, { label: "Explore", href: "/menu", icon: Compass }, { label: "Orders", href: "/orders", icon: ReceiptText }, { label: "Account", href: "/account", icon: UserRound }];

export function MobileBottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login") || pathname.startsWith("/admin") || pathname.startsWith("/owner")) return null;
  return <>
    <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden" />
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-x-0 border-b-0 border-t border-white/60 bg-crave-ink/95 px-1.5 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-white shadow-2xl backdrop-blur sm:inset-x-auto sm:left-1/2 sm:bottom-3 sm:w-[min(32rem,calc(100vw-1.5rem))] sm:-translate-x-1/2 sm:rounded-[1.4rem] sm:border sm:p-1.5 md:hidden">{items.map(({ label, href, icon: Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <Link key={href} href={href} className={cn("flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 text-[10px] font-semibold", active && "bg-crave-orange")}><Icon size={18} /><span className="max-w-full truncate">{label}</span></Link>; })}</nav>
  </>;
}
