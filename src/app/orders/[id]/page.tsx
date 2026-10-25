import { SiteNav } from "@/components/site-nav";
import { OrderTracker } from "@/components/order-tracker";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <><SiteNav /><main className="mx-auto min-h-svh max-w-6xl px-5 pb-28 pt-32 sm:px-8"><OrderTracker id={id} /></main></>; }
