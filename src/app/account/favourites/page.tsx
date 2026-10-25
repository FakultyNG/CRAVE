import { FavouritesGrid } from "@/components/favourites-grid";
import { SiteNav } from "@/components/site-nav";
import { requireSession } from "@/lib/auth/dal";
export const metadata = { title: "Favourites" };
export default async function Page() { await requireSession(); return <><SiteNav /><main className="mx-auto min-h-svh max-w-5xl px-5 pb-28 pt-32 sm:px-8"><p className="text-xs font-bold uppercase tracking-[.22em] text-crave-red">Worth craving twice</p><h1 className="mb-10 mt-3 text-5xl font-extrabold sm:text-7xl">Favourites.</h1><FavouritesGrid /></main></>; }
