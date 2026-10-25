import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Clock3, MapPin } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { connection } from "next/server";
import { getDb } from "@/lib/db";

const cravings = [
  { index: "01", slug: "nkwobi", name: "Nkwobi", note: "Rich · spicy · unforgettable", price: "₦9,800", image: "/products/nkwobi.png" },
  { index: "02", slug: "fresh-juices", name: "Fresh juice", note: "Bright · cold · freshly pressed", price: "₦4,000", image: "/products/fresh-juices.png" },
  { index: "03", slug: "smoothies", name: "Smoothies", note: "Silky · lush · made to order", price: "₦6,000", image: "/products/smoothies.png" },
  { index: "04", slug: "parfaits", name: "Parfaits", note: "Creamy · crunchy · just right", price: "₦3,000", image: "/products/parfaits.png" },
];

export const instant = false;

export default async function Home() {
  await connection();
  const campaigns = await activeCampaigns();
  return <main className="overflow-hidden pb-24 md:pb-0">
    <SiteNav />
    <section className="grain relative min-h-[94svh] bg-crave-red px-5 pb-10 pt-32 text-crave-cream sm:px-10 lg:px-16">
      <Image src="/brand/mascot-outline.svg" alt="" width={682} height={409} className="absolute -right-28 top-24 w-[36rem] opacity-30" />
      <div className="relative mx-auto grid min-h-[70svh] max-w-7xl content-between gap-16">
        <div className="max-w-6xl"><Reveal><p className="mb-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em]"><span className="size-2 rounded-full bg-crave-orange" /> Lagos, Nigeria</p></Reveal><Reveal delay={.08}><h1 className="max-w-5xl text-[clamp(4rem,12vw,10rem)] font-semibold leading-[.82]">Meet your<br /><span className="text-crave-orange">next craving.</span></h1></Reveal></div>
        <Reveal delay={.18} className="flex flex-col items-start justify-between gap-8 border-t border-crave-cream/30 pt-6 sm:flex-row sm:items-end"><p className="max-w-sm text-lg leading-relaxed text-crave-cream/80">Food and drinks with main-character energy. Made fresh in Lagos, exactly when you want it.</p><Link href="/menu" className="flex items-center gap-8 rounded-full bg-crave-cream py-3 pl-6 pr-3 font-bold text-crave-ink transition hover:gap-10"><span>Explore the menu</span><span className="grid size-11 place-items-center rounded-full bg-crave-orange text-white"><ArrowDownRight /></span></Link></Reveal>
      </div>
    </section>
    {campaigns.length > 0 && <section className="px-5 pt-14 sm:px-10 lg:px-16"><div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-2">{campaigns.map((campaign) => <article key={campaign.id} className="rounded-[2rem] bg-crave-cream p-7 sm:p-9"><p className="text-xs font-bold uppercase tracking-[.2em] text-crave-red">{campaign.name}</p><h2 className="mt-3 text-3xl font-bold">{campaign.headline}</h2>{campaign.body && <p className="mt-3 text-crave-muted">{campaign.body}</p>}{campaign.callToAction && campaign.destinationUrl && <Link href={campaign.destinationUrl} className="mt-6 inline-flex rounded-full bg-crave-orange px-5 py-3 font-bold text-white">{campaign.callToAction}</Link>}</article>)}</div></section>}
    <section className="px-5 py-24 sm:px-10 lg:px-16"><div className="mx-auto max-w-7xl"><div className="mb-12 flex items-end justify-between"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-crave-red">The opening menu</p><h2 className="text-5xl font-semibold sm:text-7xl">Pick your mood.</h2></div><Link href="/menu" className="hidden items-center gap-2 font-bold sm:flex">See everything <ArrowUpRight size={18} /></Link></div><div className="grid gap-3 md:grid-cols-2">{cravings.map((item, index) => <Link href={`/menu/${item.slug}`} key={item.name} className={`group relative min-h-72 overflow-hidden rounded-[2rem] bg-crave-ink p-7 text-white sm:p-9 ${index === 0 ? "md:row-span-2 md:min-h-[37rem]" : ""}`}><Image src={item.image} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" /><span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/15" /><span className="relative text-xs font-bold tracking-widest opacity-80">{item.index}</span><div className="absolute inset-x-7 bottom-7 sm:inset-x-9 sm:bottom-9"><p className="mb-2 text-sm text-white/75">{item.note}</p><div className="flex items-end justify-between gap-4"><h3 className="text-4xl font-semibold sm:text-5xl">{item.name}</h3><span className="rounded-full border border-white/30 bg-black/15 px-4 py-2 text-sm font-bold backdrop-blur">{item.price}</span></div></div><ArrowUpRight className="absolute right-7 top-7 transition-transform group-hover:rotate-45" /></Link>)}</div></div></section>
    <section className="mx-3 rounded-[2.2rem] bg-crave-ink px-6 py-20 text-crave-paper sm:mx-6 sm:px-12 lg:px-16"><div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1fr_.8fr] lg:items-end"><div><p className="mb-6 text-xs font-bold uppercase tracking-[.22em] text-crave-orange">Made for the moment</p><h2 className="text-5xl font-semibold leading-[.95] sm:text-7xl">Not hungry?<br />That’s never stopped a craving.</h2></div><div className="grid gap-4 text-sm sm:grid-cols-2"><div className="rounded-3xl bg-white/7 p-6"><MapPin className="mb-8 text-crave-orange" /><strong className="block text-lg">Lagos first</strong><span className="text-white/60">Delivery coverage expands as we grow.</span></div><div className="rounded-3xl bg-white/7 p-6"><Clock3 className="mb-8 text-crave-orange" /><strong className="block text-lg">Fresh by design</strong><span className="text-white/60">Prepared when you order, never before.</span></div></div></div></section>
    <footer className="px-6 py-16 sm:px-12"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 border-t border-black/10 pt-8 sm:flex-row"><p className="text-sm text-crave-muted">© 2026 Crave. Irresistible cravings, made modern.</p><div className="flex gap-6 text-sm font-semibold"><a href="https://instagram.com/forevercrave">Instagram</a><Link href="/login">Sign in</Link><Link href="/support">Support</Link></div></div></footer>
  </main>;
}

async function activeCampaigns() {
  if (!process.env.DATABASE_URL) return [];

  try {
    const now = new Date();
    return await getDb().campaign.findMany({
      where: { isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      orderBy: { startsAt: "desc" },
      take: 2,
    });
  } catch (error) {
    console.error("Homepage campaigns are temporarily unavailable.", error);
    return [];
  }
}
