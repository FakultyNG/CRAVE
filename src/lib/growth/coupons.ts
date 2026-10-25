import "server-only";

import { getDb } from "@/lib/db";
import { calculateCouponDiscount } from "./coupon-calculations";

type CouponContext = { code?: string; userId?: string | null; locationId: string; subtotalKobo: number; items: { productId: string; categoryId: string; lineTotalKobo: number }[] };
export async function validateCoupon(context: CouponContext) {
  if (!context.code?.trim()) return null;
  const db = getDb(); const now = new Date(); const code = context.code.trim().toUpperCase();
  const coupon = await db.coupon.findUnique({ where: { code }, include: { products: true, categories: true, locations: true } });
  if (!coupon?.isActive || coupon.validFrom > now || (coupon.validUntil && coupon.validUntil <= now)) throw new Error("This coupon is unavailable or expired.");
  if (context.subtotalKobo < coupon.minimumOrderKobo) throw new Error("Your order has not reached this coupon’s minimum spend.");
  if (coupon.locations.length && !coupon.locations.some((item) => item.locationId === context.locationId)) throw new Error("This coupon is not available at this location.");
  const eligibleItems = context.items.filter((item) => (!coupon.products.length || coupon.products.some((rule) => rule.productId === item.productId)) && (!coupon.categories.length || coupon.categories.some((rule) => rule.categoryId === item.categoryId)));
  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.lineTotalKobo, 0); if (!eligibleSubtotal) throw new Error("This coupon does not apply to the selected products.");
  const totalUses = await db.couponRedemption.count({ where: { couponId: coupon.id } }); if (coupon.maximumRedemptions !== null && totalUses >= coupon.maximumRedemptions) throw new Error("This coupon has reached its redemption limit.");
  if (context.userId) { const [uses, paidOrders] = await Promise.all([db.couponRedemption.count({ where: { couponId: coupon.id, userId: context.userId } }), db.order.count({ where: { userId: context.userId, paidAt: { not: null } } })]); if (uses >= coupon.maximumPerCustomer) throw new Error("You have already used this coupon."); if (coupon.firstOrderOnly && paidOrders > 0) throw new Error("This coupon is for first orders only."); }
  else if (coupon.firstOrderOnly || coupon.maximumPerCustomer > 0) throw new Error("Sign in to use this coupon.");
  const discountKobo = calculateCouponDiscount({ discountType: coupon.discountType, value: coupon.value, eligibleSubtotalKobo: eligibleSubtotal, maximumDiscountKobo: coupon.maximumDiscountKobo });
  return { coupon, discountKobo };
}
