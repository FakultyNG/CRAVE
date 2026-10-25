import "server-only";

import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hashToken, randomToken } from "@/lib/auth/crypto";
import { lineTotalKobo } from "./pricing";

const GUEST_COOKIE = "crave_guest_cart";
const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function cartOwner(createGuest = false) {
  const session = await getSession();
  if (session) return { userId: session.user.id, guestTokenHash: null as string | null };
  const store = await cookies();
  let token = store.get(GUEST_COOKIE)?.value;
  if (!token && createGuest) {
    token = randomToken();
    store.set(GUEST_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CART_TTL_MS / 1000,
    });
  }
  return { userId: null as string | null, guestTokenHash: token ? hashToken(token) : null };
}

export async function activeCart(create = false) {
  const owner = await cartOwner(create);
  if (!owner.userId && !owner.guestTokenHash) return null;
  const db = getDb();
  const where = owner.userId ? { userId: owner.userId, status: "ACTIVE" as const } : { guestTokenHash: owner.guestTokenHash!, status: "ACTIVE" as const };
  let cart = await db.cart.findFirst({ where, orderBy: { updatedAt: "desc" } });
  if (!cart && create) cart = await db.cart.create({ data: { ...owner, expiresAt: new Date(Date.now() + CART_TTL_MS) } });
  return cart;
}

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: { product: { include: { media: { where: { isCover: true }, take: 1 } } }, variant: true, options: { include: { option: true } } },
  },
};

export async function cartPayload(cartId: string) {
  const cart = await getDb().cart.findUnique({ where: { id: cartId }, include: cartInclude });
  if (!cart) return { id: null, items: [], itemCount: 0, subtotalKobo: 0 };
  const items = cart.items.map((item) => {
    const unitPriceKobo = item.product.basePriceKobo + (item.variant?.priceDeltaKobo ?? 0) + item.options.reduce((sum, selected) => sum + selected.option.priceDeltaKobo, 0);
    return {
      id: item.id,
      quantity: item.quantity,
      product: { slug: item.product.slug, name: item.product.name, image: item.product.media[0]?.url ?? "" },
      variant: item.variant?.name ?? null,
      options: item.options.map((selected) => selected.option.name),
      unitPriceKobo,
      lineTotalKobo: lineTotalKobo({ quantity: item.quantity, basePriceKobo: item.product.basePriceKobo, variantDeltaKobo: item.variant?.priceDeltaKobo, optionDeltasKobo: item.options.map((selected) => selected.option.priceDeltaKobo) }),
    };
  });
  return { id: cart.id, items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), subtotalKobo: items.reduce((sum, item) => sum + item.lineTotalKobo, 0) };
}

export async function ownedCartItem(itemId: string) {
  const cart = await activeCart();
  if (!cart) return null;
  return getDb().cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
}
