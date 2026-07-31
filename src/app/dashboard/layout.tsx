import type { Metadata } from "next";

import { PortalShell } from "@/components/shell/portal-shell";
import type { PortalNavItem } from "@/components/shell/portal-nav";
import { getActiveHackathon } from "@/lib/hackathon";
import { requireRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Dashboard" };

const NAV: PortalNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "LayoutDashboard", exact: true },
  { href: "/dashboard/submit", label: "Submit video", icon: "Upload" },
  { href: "/dashboard/scorecard", label: "My scorecard", icon: "ClipboardList" },
  { href: "/dashboard/profile", label: "Profile", icon: "User" },
  { href: "/leaderboard", label: "Leaderboard", icon: "Trophy" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("CONTESTANT");
  const hackathon = await getActiveHackathon();

  return (
    <PortalShell
      areaLabel="Contestant dashboard"
      items={NAV}
      eventStatus={hackathon?.status}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        contestantId: user.contestantId,
      }}
    >
      {children}
    </PortalShell>
  );
}
