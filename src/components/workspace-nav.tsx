"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorkspaceNav({ links }: { links: { label: string; href: string }[] }) {
  const pathname = usePathname();
  return <nav className="flex gap-2 overflow-x-auto lg:flex-col">{links.map((link) => { const active = link.href === "/admin" || link.href === "/owner" ? pathname === link.href : pathname.startsWith(link.href); return <Link key={link.href} href={link.href} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold ${active ? "bg-crave-orange text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>{link.label}</Link>; })}</nav>;
}
