import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "./brand-logo";
import { WorkspaceNav } from "./workspace-nav";

export function WorkspaceShell({ title, subtitle, links, children }: { title: string; subtitle: string; links: { label: string; href: string }[]; children: ReactNode }) {
  return <main className="min-h-svh bg-[#f5f1e8] lg:grid lg:grid-cols-[17rem_1fr]"><aside className="border-b border-black/10 bg-crave-ink p-6 text-white lg:sticky lg:top-0 lg:h-svh lg:border-b-0"><Link href="/" aria-label="Crave home"><BrandLogo inverse className="mb-12 w-28" /></Link><WorkspaceNav links={links} /></aside><section className="min-w-0 p-5 sm:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-crave-red">{subtitle}</p><h1 className="mt-3 text-4xl font-semibold capitalize sm:text-6xl">{title}</h1><div className="mt-10">{children}</div></section></main>;
}
