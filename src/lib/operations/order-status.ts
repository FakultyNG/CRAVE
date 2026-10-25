import type { OrderStatus } from "@/generated/prisma/client";

const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAYMENT_CONFIRMED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "READY_FOR_PICKUP", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  READY_FOR_PICKUP: ["COLLECTED"],
};

export function canTransition(from: OrderStatus, to: OrderStatus, fulfillment: "DELIVERY" | "PICKUP") {
  if (!(transitions[from] ?? []).includes(to)) return false;
  if (to === "READY" && fulfillment !== "DELIVERY") return false;
  if (to === "READY_FOR_PICKUP" && fulfillment !== "PICKUP") return false;
  return true;
}

export const kitchenStatuses: OrderStatus[] = ["PAYMENT_CONFIRMED", "ACCEPTED", "PREPARING", "READY", "READY_FOR_PICKUP"];
