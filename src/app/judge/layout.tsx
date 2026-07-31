import type { Metadata } from "next";

import type { PortalNavItem } from "@/components/shell/portal-nav";
import { PortalShell } from "@/components/shell/portal-shell";
import { getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Judge portal" };

export default async function JudgeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("JUDGE", "ADMIN");
  const hackathon = await getActiveHackathon();

  const pending = user.judgeId
    ? await prisma.judgeAssignment.count({
        where: { judgeId: user.judgeId, completedAt: null },
      })
    : 0;

  const nav: PortalNavItem[] = [
    {
      href: "/judge",
      label: "My queue",
      icon: "ListChecks",
      exact: true,
      badge: pending,
    },
    { href: "/judge/completed", label: "Completed", icon: "CheckCheck" },
    { href: "/leaderboard", label: "Leaderboard", icon: "Trophy" },
  ];

  return (
    <PortalShell
      areaLabel="Judge portal"
      items={nav}
      eventStatus={hackathon?.status}
      user={{ name: user.name, email: user.email, role: user.role }}
    >
      {children}
    </PortalShell>
  );
}
