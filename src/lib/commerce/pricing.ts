export type PriceableItem = {
  quantity: number;
  basePriceKobo: number;
  variantDeltaKobo?: number;
  optionDeltasKobo?: number[];
};

export function lineTotalKobo(item: PriceableItem) {
  const unit = item.basePriceKobo + (item.variantDeltaKobo ?? 0) + (item.optionDeltasKobo ?? []).reduce((sum, value) => sum + value, 0);
  return unit * item.quantity;
}

export function cartTotals(items: PriceableItem[], deliveryFeeKobo = 0) {
  const subtotalKobo = items.reduce((sum, item) => sum + lineTotalKobo(item), 0);
  return { subtotalKobo, deliveryFeeKobo, totalKobo: subtotalKobo + deliveryFeeKobo };
}
