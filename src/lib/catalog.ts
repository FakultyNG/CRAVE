export type CatalogOption = { name: string; priceKobo: number };
export type CatalogVariant = { name: string; priceDeltaKobo: number };

export type CatalogProduct = {
  slug: string;
  name: string;
  category: "Food" | "Drinks" | "Treats";
  eyebrow: string;
  description: string;
  basePriceKobo: number;
  image: string;
  accent: string;
  preparationMins: number;
  allergens: string[];
  variants: CatalogVariant[];
  optionGroup: string;
  options: CatalogOption[];
};

export const catalog: CatalogProduct[] = [
  {
    slug: "nkwobi",
    name: "Nkwobi",
    category: "Food",
    eyebrow: "The savoury one",
    description: "Tender cow foot folded through our silky palm-oil spice sauce, finished with onions and utazi.",
    basePriceKobo: 980000,
    image: "/products/nkwobi.png",
    accent: "#e4281f",
    preparationMins: 25,
    allergens: [],
    variants: [{ name: "Classic bowl", priceDeltaKobo: 0 }, { name: "Big craving", priceDeltaKobo: 320000 }],
    optionGroup: "Finish it your way",
    options: [{ name: "Extra onions", priceKobo: 5000 }, { name: "Extra utazi", priceKobo: 5000 }, { name: "Extra sauce", priceKobo: 50000 }],
  },
  {
    slug: "fresh-juices",
    name: "Fresh Juices",
    category: "Drinks",
    eyebrow: "Pressed to order",
    description: "Bright, cold-pressed fruit blends with no concentrates, no shortcuts and no dull sips.",
    basePriceKobo: 400000,
    image: "/products/fresh-juices.png",
    accent: "#f66610",
    preparationMins: 10,
    allergens: [],
    variants: [{ name: "50cl bottle", priceDeltaKobo: 0 }, { name: "1 litre bottle", priceDeltaKobo: 350000 }],
    optionGroup: "Choose a blend",
    options: [{ name: "Orange & pineapple", priceKobo: 0 }, { name: "Watermelon & lime", priceKobo: 0 }, { name: "Green glow", priceKobo: 50000 }],
  },
  {
    slug: "smoothies",
    name: "Smoothies",
    category: "Drinks",
    eyebrow: "Thick and joyful",
    description: "Fruit-forward, ice-cold and blended until gloriously smooth. A proper little reset.",
    basePriceKobo: 600000,
    image: "/products/smoothies.png",
    accent: "#f0ad2f",
    preparationMins: 12,
    allergens: ["Dairy"],
    variants: [{ name: "Regular", priceDeltaKobo: 0 }, { name: "Large", priceDeltaKobo: 180000 }],
    optionGroup: "Choose a mood",
    options: [{ name: "Mango sunshine", priceKobo: 0 }, { name: "Berry blush", priceKobo: 0 }, { name: "Peanut power", priceKobo: 100000 }],
  },
  {
    slug: "parfaits",
    name: "Parfaits",
    category: "Treats",
    eyebrow: "Layers on layers",
    description: "Creamy yoghurt, toasted granola and fresh fruit assembled in generous, crunchy layers.",
    basePriceKobo: 300000,
    image: "/products/parfaits.png",
    accent: "#5f7d3b",
    preparationMins: 8,
    allergens: ["Dairy", "Nuts", "Gluten"],
    variants: [{ name: "Cup", priceDeltaKobo: 0 }, { name: "Sharing jar", priceDeltaKobo: 300000 }],
    optionGroup: "Add something lovely",
    options: [{ name: "Extra granola", priceKobo: 50000 }, { name: "Honey drizzle", priceKobo: 30000 }, { name: "Extra fruit", priceKobo: 80000 }],
  },
];

export const catalogBySlug = new Map(catalog.map((product) => [product.slug, product]));

export const deliveryZones = [
  { name: "Victoria Island", slug: "victoria-island", feeKobo: 180000, minimumOrderKobo: 300000, estimatedMinutes: 40 },
  { name: "Ikoyi", slug: "ikoyi", feeKobo: 220000, minimumOrderKobo: 300000, estimatedMinutes: 45 },
  { name: "Lekki Phase 1", slug: "lekki-phase-1", feeKobo: 250000, minimumOrderKobo: 400000, estimatedMinutes: 50 },
  { name: "Oniru", slug: "oniru", feeKobo: 200000, minimumOrderKobo: 300000, estimatedMinutes: 45 },
] as const;
