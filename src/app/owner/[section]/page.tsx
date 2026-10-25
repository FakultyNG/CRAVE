import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireSession } from "@/lib/auth/dal";
import { OwnerWallet } from "@/components/owner-wallet";
import { OwnerDashboard } from "@/components/owner-dashboard";

const links = [{ label: "Crave Profit Split", href: "/owner" }, { label: "Profit history", href: "/owner/profit" }, { label: "Statements", href: "/owner/statements" }, { label: "Withdrawals", href: "/owner/withdrawals" }];

export default async function OwnerSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const session = await requireSession();
  if (session.user.role !== "Owner") redirect("/account?error=forbidden");
  const { section } = await params;
  const content = section === "withdrawals" ? <OwnerWallet /> : section === "profit" ? <OwnerDashboard view="profit" /> : section === "statements" ? <OwnerDashboard view="statements" /> : null;
  if (!content) redirect("/owner");
  return <WorkspaceShell title={section.replaceAll("-", " ")} subtitle="Owner portal" links={links}>{content}</WorkspaceShell>;
}
