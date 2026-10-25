import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireSession } from "@/lib/auth/dal";
import { OwnerDashboard } from "@/components/owner-dashboard";

export const metadata = { title: "Owner portal" };
const links = [{ label: "Crave Profit Split", href: "/owner" }, { label: "Profit history", href: "/owner/profit" }, { label: "Statements", href: "/owner/statements" }, { label: "Withdrawals", href: "/owner/withdrawals" }];

export default async function OwnerPage() {
  const session = await requireSession();
  if (session.user.role !== "Owner") redirect("/account?error=forbidden");
  return <WorkspaceShell title="Private by design." subtitle="Owner portal" links={links}><OwnerDashboard /></WorkspaceShell>;
}
