import { WorkspaceShell } from "@/components/workspace-shell";
import { requireSession } from "@/lib/auth/dal";
import { adminLinks } from "@/lib/admin-nav";
import { AdminOverview } from "@/components/admin-overview";
import { StaffWallet } from "@/components/staff-wallet";

export const metadata = { title: "Admin workspace" };
export default async function AdminPage() {
  const session = await requireSession();
  const links = adminLinks.filter((item) => item.permission === "staff.wallet" || session.user.permissions.includes(item.permission));
  return <WorkspaceShell title={`Good day, ${session.user.preferredName}.`} subtitle="Live operations" links={[...links]}>
    {session.user.permissions.includes("orders.read") ? <AdminOverview /> : <StaffWallet />}
  </WorkspaceShell>;
}
