import Link from "next/link";
import { ArrowUpRight, Gift, Heart, MapPinned, ReceiptText, Users } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { LogoutButton } from "@/components/logout-button";
import { requireSession } from "@/lib/auth/dal";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const session = await requireSession();
  const cards = [{ label: "Your orders", href: "/orders", icon: ReceiptText }, { label: "Saved addresses", href: "/account/addresses", icon: MapPinned }, { label: "Favourites", href: "/account/favourites", icon: Heart }, { label: "Crave Together", href: "/account/referrals", icon: Users }, { label: "Crave Credit", href: "/account/rewards", icon: Gift }];
  return <main className="min-h-svh pb-28 pt-28"><SiteNav /><section className="mx-auto max-w-6xl px-5 sm:px-10"><div className="mb-12 flex items-end justify-between gap-6"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-crave-red">Your space</p><h1 className="text-5xl font-semibold sm:text-7xl">Hey, {session.user.preferredName}.</h1><p className="mt-4 text-crave-muted">Your session stays active for 120 hours after every visit.</p></div><LogoutButton /></div><div className="grid gap-3 md:grid-cols-3">{cards.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className="group flex min-h-48 flex-col justify-between rounded-[2rem] bg-white p-7 shadow-[0_15px_50px_rgba(60,30,15,.06)]"><Icon className="text-crave-orange" /><div className="flex items-end justify-between"><h2 className="text-2xl font-semibold">{label}</h2><ArrowUpRight className="transition-transform group-hover:rotate-45" /></div></Link>)}</div></section></main>;
}
