import Link from "next/link";
import { UserRound } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { CartLink } from "./cart-link";

export function SiteNav() {
  return <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-8"><nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-crave-paper/85 px-5 py-3 shadow-[0_12px_40px_rgba(72,28,10,.08)] backdrop-blur-xl"><Link href="/" aria-label="Crave home"><BrandLogo className="w-[88px]" /></Link><div className="hidden items-center gap-8 text-sm font-semibold md:flex"><Link href="/">Home</Link><Link href="/menu">Explore</Link><Link href="/orders">Orders</Link></div><div className="flex items-center gap-1"><CartLink /><Link href="/account" aria-label="Account" className="grid size-10 place-items-center rounded-full bg-crave-red text-white"><UserRound size={18} /></Link></div></nav></header>;
}
