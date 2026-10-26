import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { catalog, deliveryZones } from "../src/lib/catalog";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const permissionKeys = [
  "orders.read", "orders.update", "orders.cancel", "orders.refund",
  "products.read", "products.create", "products.update", "products.delete",
  "media.manage", "customers.read", "customers.manage", "marketing.manage",
  "coupons.manage", "referrals.manage", "inventory.read", "inventory.manage",
  "accounting.read", "accounting.manage", "reports.read", "staff.manage",
  "owners.read", "owners.manage", "profit.calculate", "profit.approve",
  "payouts.request", "payouts.approve", "settings.manage", "audit.read",
] as const;

const costBySlug: Record<string, number> = { nkwobi: 700000, "fresh-juices": 200000, smoothies: 300000, parfaits: 200000 };

const accountingAccounts = [
  ["1000", "PAYMENT_CLEARING", "Payment provider clearing", "ASSET"], ["1010", "BANK", "Bank and settled cash", "ASSET"], ["1200", "INVENTORY", "Inventory and production cost reserve", "ASSET"], ["1300", "PREFUNDED_PAYROLL", "Prefunded payroll capital", "ASSET"],
  ["2000", "ACCOUNTS_PAYABLE", "Accounts payable", "LIABILITY"], ["2100", "PROMOTIONAL_CREDIT", "Crave Credit liability", "LIABILITY"], ["2200", "PAYROLL_PAYABLE", "Payroll payable", "LIABILITY"], ["2300", "OWNER_DISTRIBUTIONS_PAYABLE", "Approved owner distributions payable", "LIABILITY"], ["3000", "OWNER_CAPITAL", "Owner contributed capital", "EQUITY"], ["3100", "OWNER_DISTRIBUTIONS", "Owner profit distributions", "EQUITY"],
  ["4000", "SALES_REVENUE", "Food and beverage sales", "REVENUE"], ["4010", "DELIVERY_REVENUE", "Delivery revenue", "REVENUE"], ["4090", "SALES_DISCOUNTS", "Coupons and sales discounts", "CONTRA_REVENUE"], ["4095", "SALES_RETURNS", "Returns and refunds", "CONTRA_REVENUE"],
  ["5000", "COGS", "Cost of goods sold", "EXPENSE"], ["6000", "EXP_INGREDIENTS", "Ingredients expense", "EXPENSE"], ["6010", "EXP_PACKAGING", "Packaging expense", "EXPENSE"], ["6020", "EXP_SALARIES", "Salaries expense", "EXPENSE"], ["6030", "EXP_RENT", "Rent expense", "EXPENSE"], ["6040", "EXP_ELECTRICITY", "Electricity expense", "EXPENSE"], ["6050", "EXP_COOKING_GAS", "Cooking gas expense", "EXPENSE"], ["6060", "EXP_WATER", "Water expense", "EXPENSE"], ["6070", "EXP_MARKETING", "Marketing expense", "EXPENSE"], ["6080", "EXP_DELIVERY_SUBSIDIES", "Delivery subsidies", "EXPENSE"], ["6090", "EXP_REPAIRS", "Repairs and maintenance", "EXPENSE"], ["6100", "EXP_MISC", "Miscellaneous operating expense", "EXPENSE"], ["7000", "PROCESSING_FEES", "Payment processing fees", "EXPENSE"], ["7100", "TAXES_OTHER", "Taxes and other charges", "EXPENSE"],
] as const;

const expenseCategories = [["ingredients", "Ingredients", "EXP_INGREDIENTS", true], ["packaging", "Packaging", "EXP_PACKAGING", false], ["salaries", "Salaries", "EXP_SALARIES", false], ["rent", "Rent", "EXP_RENT", false], ["electricity", "Electricity", "EXP_ELECTRICITY", false], ["cooking-gas", "Cooking gas", "EXP_COOKING_GAS", false], ["water", "Water", "EXP_WATER", false], ["marketing", "Marketing", "EXP_MARKETING", false], ["delivery-subsidies", "Delivery subsidies", "EXP_DELIVERY_SUBSIDIES", false], ["repairs", "Repairs", "EXP_REPAIRS", false], ["miscellaneous", "Miscellaneous operating costs", "EXP_MISC", false]] as const;

const rolePermissions: Record<string, readonly string[]> = {
  "Super Admin": permissionKeys,
  "Business Manager": ["orders.read", "orders.update", "orders.cancel", "products.read", "products.create", "products.update", "media.manage", "customers.read", "customers.manage", "inventory.read", "inventory.manage", "reports.read"],
  "Kitchen Staff": ["orders.read", "orders.update", "inventory.read"],
  "Marketing Manager": ["products.read", "media.manage", "customers.read", "marketing.manage", "coupons.manage", "referrals.manage", "reports.read"],
  "Finance Manager": ["orders.read", "accounting.read", "accounting.manage", "reports.read", "profit.calculate", "profit.approve", "payouts.approve", "audit.read"],
  "Support Staff": ["orders.read", "customers.read", "customers.manage"],
  Owner: ["owners.read", "payouts.request"],
};

async function main() {
  if (process.argv.includes("--if-empty")) {
    const productCount = await prisma.product.count();
    if (productCount > 0) {
      console.log(`Catalogue already contains ${productCount} product(s); skipping initial seed.`);
      return;
    }
  }

  const location = await prisma.location.upsert({
    where: { slug: "lagos" },
    update: {},
    create: { name: "Lagos Kitchen", slug: "lagos", city: "Lagos", status: "ACTIVE" },
  });

  for (const key of permissionKeys) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  for (const [code, systemKey, name, type] of accountingAccounts) {
    await prisma.accountingAccount.upsert({ where: { systemKey }, update: { code, name, type }, create: { code, systemKey, name, type } });
  }
  const accounts = await prisma.accountingAccount.findMany({ select: { id: true, systemKey: true } });
  for (const [systemKey, name, accountKey, inventoryPurchase] of expenseCategories) {
    const defaultAccountId = accounts.find((account) => account.systemKey === accountKey)?.id;
    if (!defaultAccountId) throw new Error(`Missing account ${accountKey}`);
    await prisma.expenseCategory.upsert({ where: { systemKey }, update: { name, defaultAccountId, inventoryPurchase }, create: { systemKey, name, defaultAccountId, inventoryPurchase } });
  }

  const permissions = await prisma.permission.findMany();
  for (const [name, keys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name, isSystem: true } });
    await prisma.rolePermission.createMany({ data: permissions.filter((permission) => keys.includes(permission.key)).map((permission) => ({ roleId: role.id, permissionId: permission.id })), skipDuplicates: true });
  }

  const category = await prisma.category.upsert({
    where: { slug: "crave-classics" },
    update: {},
    create: { name: "Crave Classics", slug: "crave-classics" },
  });

  for (const zone of deliveryZones) {
    await prisma.deliveryZone.upsert({
      where: { slug: zone.slug },
      update: { ...zone, locationId: location.id },
      create: { ...zone, locationId: location.id },
    });
  }

  for (const item of catalog) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        basePriceKobo: item.basePriceKobo,
        preparationMins: item.preparationMins,
        allergens: item.allergens,
        status: "ACTIVE",
      },
      create: {
        categoryId: category.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        basePriceKobo: item.basePriceKobo,
        status: "ACTIVE",
        preparationMins: item.preparationMins,
        allergens: item.allergens,
      },
    });
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    await prisma.productOption.deleteMany({ where: { productId: product.id } });
    await prisma.productMedia.deleteMany({ where: { productId: product.id } });
    await prisma.productVariant.createMany({ data: item.variants.map((variant, position) => ({ productId: product.id, name: variant.name, priceDeltaKobo: variant.priceDeltaKobo, position })) });
    await prisma.productOption.createMany({ data: item.options.map((option, position) => ({ productId: product.id, name: option.name, groupName: item.optionGroup, priceDeltaKobo: option.priceKobo, position })) });
    await prisma.productMedia.create({ data: { productId: product.id, type: "IMAGE", url: item.image, altText: `${item.name} by Crave`, isCover: true } });
    await prisma.productAvailability.upsert({
      where: { productId_locationId: { productId: product.id, locationId: location.id } },
      update: {},
      create: { productId: product.id, locationId: location.id },
    });
    const existingCost = await prisma.productCost.findFirst({
      where: { productId: product.id, locationId: location.id },
    });
    if (!existingCost) {
      await prisma.productCost.create({
        data: { productId: product.id, locationId: location.id, costKobo: costBySlug[item.slug], effectiveFrom: new Date() },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
