import type { Metadata } from "next";

import type { PortalNavItem } from "@/components/shell/portal-nav";
import { PortalShell } from "@/components/shell/portal-shell";
import { getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  const hackathon = await getActiveHackathon();

  const [contestants, submissions, failedEmails] = hackathon
    ? await Promise.all([
        prisma.contestant.count({ where: { hackathonId: hackathon.id } }),
        prisma.submission.count({
          where: { hackathonId: hackathon.id, status: { in: ["SUBMITTED", "LATE"] } },
        }),
        prisma.emailReminder.count({
          where: { hackathonId: hackathon.id, status: "FAILED" },
        }),
      ])
    : [0, 0, 0];

  const nav: PortalNavItem[] = [
    { href: "/admin", label: "Control panel", icon: "Gauge", exact: true },
    {
      href: "/admin/contestants",
      label: "Contestants",
      icon: "Users",
      badge: contestants,
    },
    {
      href: "/admin/submissions",
      label: "Submissions",
      icon: "Video",
      badge: submissions,
    },
    { href: "/admin/judges", label: "Judges", icon: "UserCheck" },
    { href: "/admin/assignments", label: "Assignments", icon: "Shuffle" },
    { href: "/admin/ratings", label: "Ratings", icon: "Star" },
    { href: "/admin/emails", label: "Emails", icon: "Mail", badge: failedEmails },
    { href: "/admin/content", label: "Site content", icon: "LayoutTemplate" },
    { href: "/admin/reports", label: "Reports", icon: "FileDown" },
    { href: "/admin/settings", label: "Settings", icon: "Settings" },
  ];

  return (
    <PortalShell
      areaLabel="Admin console"
      items={nav}
      eventStatus={hackathon?.status}
      user={{ name: user.name, email: user.email, role: user.role }}
    >
      {children}
    </PortalShell>
  );
}
