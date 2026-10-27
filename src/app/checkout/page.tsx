import { connection } from "next/server";
import { CheckoutForm } from "@/components/checkout-form";
import { getDb } from "@/lib/db";

export const metadata = { title: "Checkout" };
export default async function CheckoutPage() {
  await connection();
  const location = await getDb().location.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
  const deliveryZones = location ? await getDb().deliveryZone.findMany({ where: { locationId: location.id, isActive: true }, orderBy: { name: "asc" }, select: { name: true, slug: true, feeKobo: true, minimumOrderKobo: true, estimatedMinutes: true } }) : [];
  return <main className="mx-auto min-h-svh max-w-6xl px-5 pb-28 pt-10 sm:px-8"><CheckoutForm deliveryZones={deliveryZones} /></main>;
}
