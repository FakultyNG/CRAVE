import { WorkspaceShell } from "@/components/workspace-shell";
import { requirePermission, requireSession } from "@/lib/auth/dal";
import { adminLinks } from "@/lib/admin-nav";
import { KitchenBoard } from "@/components/kitchen-board";
import { ProductManager } from "@/components/product-manager";
import { CustomerManager } from "@/components/customer-manager";
import { StaffManager } from "@/components/staff-manager";
import { InventoryManager } from "@/components/inventory-manager";
import { PayoutManager } from "@/components/payout-manager";
import type { ReactNode } from "react";
import { OrderRegister } from "@/components/order-register";
import { StaffWallet } from "@/components/staff-wallet";
import { PayrollFundingSwitch } from "@/components/payroll-funding-switch";
import { GrowthManager } from "@/components/growth-manager";
import { AccountingWorkspace } from "@/components/accounting-workspace";
import { FinancialReports } from "@/components/financial-reports";
import { OwnerManager } from "@/components/owner-manager";
import { ProfitManager } from "@/components/profit-manager";
import { DeliveryZoneManager } from "@/components/delivery-zone-manager";

const permissionBySection: Record<string, string> = { orders: "orders.read", products: "products.read", "delivery-areas": "settings.manage", customers: "customers.read", marketing: "marketing.manage", coupons: "coupons.manage", referrals: "referrals.manage", inventory: "inventory.read", accounting: "accounting.read", reports: "reports.read", owners: "owners.read", profit: "profit.calculate", staff: "staff.manage", payouts: "payouts.approve" };
const componentBySection: Record<string, ReactNode> = { wallet: <StaffWallet />, orders: <><KitchenBoard /><OrderRegister /></>, products: <ProductManager />, "delivery-areas": <DeliveryZoneManager />, customers: <CustomerManager />, marketing: <GrowthManager view="marketing" />, coupons: <GrowthManager view="coupons" />, referrals: <GrowthManager view="referrals" />, inventory: <InventoryManager />, accounting: <AccountingWorkspace />, reports: <FinancialReports />, owners: <OwnerManager />, profit: <ProfitManager />, staff: <><PayrollFundingSwitch /><StaffManager /></>, payouts: <PayoutManager /> };

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const session = section === "wallet" ? await requireSession() : await requirePermission(permissionBySection[section] ?? "settings.manage");
  const links = adminLinks.filter((item) => item.permission === "staff.wallet" || session.user.permissions.includes(item.permission));
  return <WorkspaceShell title={section === "orders" ? "Orders & kitchen" : section.replaceAll("-", " ")} subtitle="Admin workspace" links={[...links]}>{componentBySection[section] ?? <div className="rounded-3xl bg-white p-8"><p className="font-semibold">This module is not available in Phase 3.</p></div>}</WorkspaceShell>;
}
