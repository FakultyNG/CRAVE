import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { SiteNav } from "./site-nav";

export function PhasePlaceholder({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <main className="min-h-svh bg-crave-cream pb-28 pt-32"><SiteNav /><section className="mx-auto max-w-5xl px-5 sm:px-10"><div className="relative overflow-hidden rounded-[2.5rem] bg-crave-red p-8 text-crave-cream sm:p-14"><Sparkles className="mb-20 text-crave-orange" size={32} /><p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-crave-orange">{eyebrow}</p><h1 className="max-w-3xl text-5xl font-semibold leading-[.95] sm:text-7xl">{title}</h1><p className="mt-6 max-w-xl text-base leading-relaxed text-crave-cream/75">{description}</p><Link href="/" className="mt-10 inline-flex items-center gap-2 rounded-full bg-crave-cream px-5 py-3 text-sm font-bold text-crave-ink"><ArrowLeft size={16} /> Back home</Link></div></section></main>;
}
