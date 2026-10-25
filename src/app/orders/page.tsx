import { OrderList } from "@/components/order-list";
import { SiteNav } from "@/components/site-nav";
export const metadata = { title: "Orders" };
export default function Page() { return <><SiteNav /><main className="mx-auto min-h-svh max-w-5xl px-5 pb-28 pt-32 sm:px-8"><p className="text-xs font-bold uppercase tracking-[.22em] text-crave-red">From first bite to latest</p><h1 className="mt-3 text-5xl font-extrabold sm:text-7xl">Your orders.</h1><OrderList /></main></>; }
