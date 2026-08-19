import { Mail, RefreshCw, Send } from "lucide-react";
import type { Metadata } from "next";

import { ActionButton } from "@/components/admin/action-button";
import { StatCard } from "@/components/shared/stat-card";
import { ReminderStatusBadge } from "@/components/shared/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { integrationStatus } from "@/lib/env";
import { getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatIST } from "@/lib/utils";
import { retryReminder, runReminderQueue } from "@/server/actions/admin/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Emails" };

const TYPE_LABELS: Record<string, string> = {
  REGISTRATION_CONFIRMATION: "Welcome",
  THREE_DAYS_BEFORE: "T-3 days",
  TWO_DAYS_BEFORE: "T-2 days",
  ONE_DAY_BEFORE: "T-1 day",
  ONE_HOUR_BEFORE: "T-1 hour",
  ASSETS_RELEASED: "Assets released",
  SUBMISSION_RECEIVED: "Submission received",
  RESULTS_ANNOUNCED: "Results",
};

export default async function AdminEmailsPage() {
  await requireRole("ADMIN");
  const hackathon = await getActiveHackathon();
  if (!hackathon) return null;

  const [reminders, scheduled, sent, failed, byType] = await Promise.all([
    prisma.emailReminder.findMany({
      where: { hackathonId: hackathon.id },
      orderBy: [{ status: "asc" }, { scheduledFor: "asc" }],
      take: 300,
      include: { contestant: { select: { contestantId: true, fullName: true } } },
    }),
    prisma.emailReminder.count({
      where: { hackathonId: hackathon.id, status: "SCHEDULED" },
    }),
    prisma.emailReminder.count({
      where: { hackathonId: hackathon.id, status: "SENT" },
    }),
    prisma.emailReminder.count({
      where: { hackathonId: hackathon.id, status: "FAILED" },
    }),
    prisma.emailReminder.groupBy({
      by: ["type", "status"],
      where: { hackathonId: hackathon.id },
      _count: true,
    }),
  ]);

  const mailReady = integrationStatus().email;
  const dueNow = reminders.filter(
    (reminder) =>
      reminder.status === "SCHEDULED" && reminder.scheduledFor.getTime() <= Date.now(),
  ).length;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow">Automation</p>
          <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Email queue</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Reminders are queued at registration and drained by a cron job every 15
            minutes. Failures retry twice, then wait here for you.
          </p>
        </div>
        <ActionButton action={runReminderQueue}>
          <Send />
          Run queue now
          {dueNow > 0 ? ` (${dueNow} due)` : ""}
        </ActionButton>
      </div>

      {!mailReady ? (
        <Alert variant="warning">
          <AlertTitle>Email sending is not configured</AlertTitle>
          <AlertDescription>
            Emails are being logged to the server console instead of sent. Set the SMTP
            credentials and turn off{" "}
            <code className="font-mono">INTEGRATIONS_DRY_RUN</code>.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Scheduled" value={scheduled} icon={Mail} tone="steel" />
        <StatCard label="Due right now" value={dueNow} tone="orange" />
        <StatCard label="Sent" value={sent} tone="emerald" />
        <StatCard
          label="Failed"
          value={failed}
          hint={failed > 0 ? "Retry from the table below" : "Nothing to fix"}
          tone={failed > 0 ? "rose" : "neutral"}
        />
      </div>

      <Card className="p-5">
        <p className="label-eyebrow">By type</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {byType.map((row) => (
            <span
              key={`${row.type}-${row.status}`}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs"
            >
              {TYPE_LABELS[row.type] ?? row.type}:{" "}
              <span className="font-semibold">{row._count}</span>{" "}
              <span className="text-muted-foreground">{row.status.toLowerCase()}</span>
            </span>
          ))}
        </div>
      </Card>

      {reminders.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Queue is empty"
          description="Reminders are created when contestants register."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden lg:table-cell">Subject</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="hidden sm:table-cell">Sent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.map((reminder) => (
                <TableRow key={reminder.id}>
                  <TableCell>
                    <p className="font-mono text-xs tracking-wider text-sky-300">
                      {reminder.contestant?.contestantId ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{reminder.toEmail}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {TYPE_LABELS[reminder.type] ?? reminder.type}
                  </TableCell>
                  <TableCell className="hidden max-w-[220px] truncate text-sm text-muted-foreground lg:table-cell">
                    {reminder.subject}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {formatIST(reminder.scheduledFor)}
                  </TableCell>
                  <TableCell className="hidden text-xs tabular-nums text-muted-foreground sm:table-cell">
                    {reminder.sentAt ? formatIST(reminder.sentAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <ReminderStatusBadge status={reminder.status} />
                    {reminder.lastError ? (
                      <p className="mt-1 max-w-[200px] text-[11px] text-rose-300/80">
                        {reminder.lastError}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {["FAILED", "CANCELLED", "SKIPPED"].includes(reminder.status) ? (
                      <ActionButton
                        action={retryReminder}
                        fields={{ reminderId: reminder.id }}
                        size="sm"
                        variant="ghost"
                        aria-label="Re-queue"
                      >
                        <RefreshCw />
                      </ActionButton>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
