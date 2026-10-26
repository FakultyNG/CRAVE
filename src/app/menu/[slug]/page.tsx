import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { SiteNav } from "@/components/site-nav";
import { FavouriteButton } from "@/components/favourite-button";
import { catalogBySlug, type CatalogProduct } from "@/lib/catalog";
import { getDb } from "@/lib/db";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: CatalogProduct | undefined;

  if (!process.env.DATABASE_URL) {
    product = catalogBySlug.get(slug);
  } else {
    try {
      const record = await getDb().product.findUnique({ where: { slug }, include: { variants: { where: { isActive: true }, orderBy: { position: "asc" } }, options: { orderBy: { position: "asc" } }, media: { orderBy: { position: "asc" } } } });
      if (record && record.status !== "ARCHIVED") {
        product = { slug: record.slug, name: record.name, category: record.name === "Nkwobi" ? "Food" : record.name === "Parfaits" ? "Treats" : "Drinks", eyebrow: record.status === "UNAVAILABLE" ? "Back soon" : "Made fresh to order", description: record.description, basePriceKobo: record.basePriceKobo, image: record.media[0]?.url ?? "/products/nkwobi.png", accent: "#e4281f", preparationMins: record.preparationMins ?? 15, allergens: record.allergens, variants: record.variants.map((item) => ({ name: item.name, priceDeltaKobo: item.priceDeltaKobo })), optionGroup: record.options[0]?.groupName ?? "Extras", options: record.options.map((item) => ({ name: item.name, priceKobo: item.priceDeltaKobo })) };
      }
    } catch (error) {
      console.error("Product lookup failed; rendering bundled catalogue fallback.", error);
      product = catalogBySlug.get(slug);
    }
  }

  if (!product) notFound();
  return <><SiteNav /><main className="mx-auto grid max-w-7xl gap-8 px-5 pb-28 pt-28 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pt-32"><div className="lg:sticky lg:top-28 lg:self-start"><div className="mb-4 flex items-center justify-between"><Link href="/menu" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={17} /> Back to menu</Link><FavouriteButton productSlug={product.slug} /></div><div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]"><Image src={product.image} alt={product.name} fill priority sizes="(max-width: 1024px) 100vw, 52vw" className="object-cover" /></div></div><section className="py-4 lg:px-8 lg:py-16"><p className="text-xs font-bold uppercase tracking-[.22em]" style={{ color: product.accent }}>{product.eyebrow}</p><h1 className="mt-3 text-5xl font-extrabold sm:text-6xl">{product.name}</h1><p className="mt-5 text-lg leading-8 text-crave-muted">{product.description}</p><div className="my-7 flex flex-wrap gap-3 text-xs font-semibold text-crave-muted"><span className="flex items-center gap-2 rounded-full bg-white px-4 py-2"><Clock3 size={15} /> {product.preparationMins} min</span>{product.allergens.map((allergen) => <span key={allergen} className="rounded-full bg-white px-4 py-2">Contains {allergen.toLowerCase()}</span>)}</div><AddToCart product={product} /></section></main></>;
}
