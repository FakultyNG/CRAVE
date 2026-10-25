import { SiteNav } from "@/components/site-nav";
import { ProductExplorer } from "@/components/product-explorer";
import { catalog } from "@/lib/catalog";
export const metadata = { title: "Explore" };
export default function Page() { return <><SiteNav /><main className="mx-auto max-w-7xl px-5 pb-28 pt-32 sm:px-8"><div className="mb-10 max-w-3xl"><p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-crave-red">Made in Lagos · made for now</p><h1 className="text-5xl font-extrabold leading-[.95] sm:text-7xl">Pick your next<br /><span className="text-crave-orange">obsession.</span></h1><p className="mt-5 max-w-xl text-base leading-7 text-crave-muted">Four signatures, plenty of ways to make them yours. Every order is prepared fresh from our Lagos kitchen.</p></div><ProductExplorer products={catalog} /></main></>; }
