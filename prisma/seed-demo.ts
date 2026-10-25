import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error("Demo seeding is disabled. Use a non-production database and set ALLOW_DEMO_SEED=true explicitly.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const [location, kitchenRole, bank, capital] = await Promise.all([
    prisma.location.findUniqueOrThrow({ where: { slug: "lagos" } }),
    prisma.role.findUniqueOrThrow({ where: { name: "Kitchen Staff" } }),
    prisma.accountingAccount.findUniqueOrThrow({ where: { systemKey: "BANK" } }),
    prisma.accountingAccount.findUniqueOrThrow({ where: { systemKey: "OWNER_CAPITAL" } }),
  ]);

  await prisma.user.upsert({
    where: { phone: "+2347000000001" },
    update: {},
    create: {
      preferredName: "Demo Customer",
      phone: "+2347000000001",
      email: "demo.customer@crave.invalid",
      phoneVerifiedAt: new Date(),
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { phone: "+2347000000002" },
    update: {},
    create: {
      preferredName: "Demo Kitchen Staff",
      phone: "+2347000000002",
      email: "demo.staff@crave.invalid",
      phoneVerifiedAt: new Date(),
    },
  });
  await prisma.staffProfile.upsert({
    where: { userId: staffUser.id },
    update: {},
    create: {
      userId: staffUser.id,
      roleId: kitchenRole.id,
      locationId: location.id,
      status: "ACTIVE",
      salaryKobo: 250_000_00,
      nextSalaryAt: new Date("2099-01-31T22:59:59.000Z"),
    },
  });

  const period = await prisma.financialPeriod.upsert({
    where: { monthKey: "2099-01" },
    update: {},
    create: {
      monthKey: "2099-01",
      startsAt: new Date("2098-12-31T23:00:00.000Z"),
      endsAt: new Date("2099-01-31T22:59:59.999Z"),
      notes: "[DEMO DATA] Isolated future period for interface testing only.",
    },
  });
  await prisma.journalEntry.upsert({
    where: { sourceType_sourceId: { sourceType: "DEMO_SEED", sourceId: "demo-opening-capital" } },
    update: {},
    create: {
      entryNumber: "DEMO-209901-0001",
      periodId: period.id,
      sourceType: "DEMO_SEED",
      sourceId: "demo-opening-capital",
      entryDate: new Date("2099-01-02T12:00:00.000Z"),
      description: "[DEMO DATA] Opening capital illustration — never use for reporting",
      lines: {
        create: [
          { accountId: bank.id, locationId: location.id, debitKobo: 100_000_00, description: "[DEMO DATA] Bank" },
          { accountId: capital.id, locationId: location.id, creditKobo: 100_000_00, description: "[DEMO DATA] Owner capital" },
        ],
      },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
