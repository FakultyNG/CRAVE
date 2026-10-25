import { SiteNav } from "@/components/site-nav";
import { CustomerGrowth } from "@/components/customer-growth";
import { requireSession } from "@/lib/auth/dal";
export default async function RewardsPage() { await requireSession(); return <main className="min-h-svh pb-28 pt-28"><SiteNav /><section className="mx-auto max-w-5xl px-5 sm:px-10"><h1 className="mb-8 text-5xl font-bold">Your Crave Credit.</h1><CustomerGrowth view="rewards" /></section></main>; }
