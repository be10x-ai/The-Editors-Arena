import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileArchive,
  KeyRound,
  Lock,
  RefreshCw,
  Send,
  Star,
  Trophy,
  Unlock,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, FieldError } from "@/components/admin/action-form";
import { CopyField } from "@/components/shared/copy-field";
import { StatCard } from "@/components/shared/stat-card";
import { EventStatusBadge } from "@/components/shared/status-badges";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVENT_STATUS_META } from "@/lib/constants";
import { integrationStatus } from "@/lib/env";
import { computeGates, getActiveHackathon, STATUS_FLOW } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatIST } from "@/lib/utils";
import {
  changeEventStatus,
  publishResults,
  recomputeRanking,
  saveAssetSettings,
  toggleAssetRelease,
  toggleJudgingLock,
  togglePasswordRelease,
} from "@/server/actions/admin/event";
import { runReminderQueue } from "@/server/actions/admin/settings";

export const dynamic = "force-dynamic";

const ORDER = [
  "NOT_STARTED",
  "RUNNING",
  "SUBMISSION_OPEN",
  "JUDGING",
  "COMPLETED",
] as const;

export default async function AdminControlPanel() {
  await requireRole("ADMIN");
  const hackathon = await getActiveHackathon();

  if (!hackathon) {
    return (
      <Alert variant="warning">
        <XCircle />
        <div>
          <AlertTitle>No active hackathon</AlertTitle>
          <AlertDescription>
            Run <code className="font-mono">npm run db:seed</code> to create the 2026
            edition, or add one directly in the database.
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  const gates = computeGates(hackathon);
  const integrations = integrationStatus();

  const [
    contestants,
    submitted,
    judgesCount,
    ratingsSubmitted,
    assignmentsTotal,
    pendingEmails,
    failedEmails,
    statusLog,
  ] = await Promise.all([
    prisma.contestant.count({ where: { hackathonId: hackathon.id } }),
    prisma.submission.count({
      where: { hackathonId: hackathon.id, status: { in: ["SUBMITTED", "LATE"] } },
    }),
    prisma.judge.count({ where: { isActive: true } }),
    prisma.rating.count({
      where: { isSubmitted: true, submission: { hackathonId: hackathon.id } },
    }),
    prisma.judgeAssignment.count({
      where: { submission: { hackathonId: hackathon.id } },
    }),
    prisma.emailReminder.count({
      where: { hackathonId: hackathon.id, status: "SCHEDULED" },
    }),
    prisma.emailReminder.count({
      where: { hackathonId: hackathon.id, status: "FAILED" },
    }),
    prisma.eventStatusLog.findMany({
      where: { hackathonId: hackathon.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const nextStates = STATUS_FLOW[hackathon.status];
  const currentIndex = ORDER.indexOf(hackathon.status);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-eyebrow">Control panel</p>
          <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">{hackathon.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Event day {formatIST(hackathon.startsAt)} IST · deadline{" "}
            {formatIST(hackathon.submissionDeadline)} IST
          </p>
        </div>
        <EventStatusBadge status={hackathon.status} />
      </div>

      {integrations.dryRun ? (
        <Alert variant="info">
          <AlertTitle>Dry-run mode</AlertTitle>
          <AlertDescription>
            <code className="font-mono">INTEGRATIONS_DRY_RUN=true</code> — emails are
            logged to the server console instead of sent. Turn it off once the SMTP
            credentials are in place.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registrations" value={contestants} icon={Users} tone="gold" />
        <StatCard
          label="Submissions"
          value={submitted}
          hint={`${contestants > 0 ? Math.round((submitted / contestants) * 100) : 0}% of registrations`}
          icon={Upload}
          tone="steel"
        />
        <StatCard
          label="Scorecards submitted"
          value={ratingsSubmitted}
          hint={`${assignmentsTotal} assignments · ${judgesCount} active judges`}
          icon={Star}
          tone="orange"
        />
        <StatCard
          label="Email queue"
          value={pendingEmails}
          hint={
            failedEmails > 0
              ? `${failedEmails} failed — needs attention`
              : "No failures"
          }
          icon={Send}
          tone={failedEmails > 0 ? "rose" : "emerald"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event status</CardTitle>
          <CardDescription>
            {EVENT_STATUS_META[hackathon.status].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="flex flex-wrap gap-2">
            {ORDER.map((status, index) => (
              <li key={status}>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    index < currentIndex
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                      : index === currentIndex
                        ? EVENT_STATUS_META[status].tone
                        : "border-white/10 bg-white/[0.02] text-muted-foreground"
                  }`}
                >
                  {index < currentIndex ? <CheckCircle2 className="size-3" /> : null}
                  {EVENT_STATUS_META[status].label}
                </span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            {nextStates.map((status) => {
              const forward = ORDER.indexOf(status) > currentIndex;
              return (
                <ActionButton
                  key={status}
                  action={changeEventStatus}
                  fields={{ status }}
                  variant={forward ? "default" : "secondary"}
                  confirm={{
                    title: `Move to ${EVENT_STATUS_META[status].label}?`,
                    description: `${EVENT_STATUS_META[status].description} This is visible to every contestant and judge immediately.`,
                    confirmLabel: `Yes, set ${EVENT_STATUS_META[status].label}`,
                  }}
                >
                  {forward ? "Advance to" : "Roll back to"}{" "}
                  {EVENT_STATUS_META[status].label}
                </ActionButton>
              );
            })}
          </div>

          {statusLog.length > 0 ? (
            <div>
              <p className="label-eyebrow mb-2">Recent transitions</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {statusLog.map((log) => (
                  <li key={log.id} className="flex flex-wrap gap-x-2">
                    <span className="tabular-nums">{formatIST(log.createdAt)}</span>
                    <span className="text-foreground/80">
                      {log.from ?? "—"} → {log.to}
                    </span>
                    {log.note ? <span>· {log.note}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task asset distribution</CardTitle>
          <CardDescription>
            Two independent switches: the download link, then the ZIP password. Nothing
            is visible to contestants until you release it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ActionForm action={saveAssetSettings} className="space-y-4">
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assetZipName">ZIP file name</Label>
                  <Input
                    id="assetZipName"
                    name="assetZipName"
                    defaultValue={hackathon.assetZipName}
                    required
                  />
                  <FieldError name="assetZipName" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assetDriveUrl">Google Drive link</Label>
                  <Input
                    id="assetDriveUrl"
                    name="assetDriveUrl"
                    type="url"
                    placeholder="https://drive.google.com/file/d/…/view"
                    defaultValue={hackathon.assetDriveUrl ?? ""}
                  />
                  <FieldError name="assetDriveUrl" />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="assetZipPassword">
                    ZIP password{" "}
                    <span className="font-normal text-muted-foreground">
                      (leave blank to keep the current one)
                    </span>
                  </Label>
                  <Input
                    id="assetZipPassword"
                    name="assetZipPassword"
                    type="text"
                    autoComplete="off"
                    placeholder={
                      hackathon.assetZipPassword ? "•••••••• (set)" : "Not set yet"
                    }
                  />
                </div>
              </div>

              <SubmitButton variant="secondary" pendingLabel="Saving…">
                <FileArchive />
                Save asset settings
              </SubmitButton>
            </>
          </ActionForm>

          <div className="hairline" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Download link</p>
                <Badge variant={hackathon.assetsReleased ? "success" : "outline"}>
                  {hackathon.assetsReleased ? "Released" : "Hidden"}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {hackathon.assetsReleasedAt
                  ? `Released ${formatIST(hackathon.assetsReleasedAt)}`
                  : "Contestants cannot see the ZIP yet."}
              </p>
              <ActionButton
                action={toggleAssetRelease}
                fields={{ release: !hackathon.assetsReleased }}
                variant={hackathon.assetsReleased ? "secondary" : "default"}
                size="sm"
                className="mt-3"
                confirm={
                  hackathon.assetsReleased
                    ? {
                        title: "Hide the task files?",
                        description:
                          "Contestants lose the download link, and the ZIP password is hidden too.",
                      }
                    : {
                        title: "Release the task files?",
                        description:
                          "Every contestant gets the download link immediately, and an email goes out.",
                      }
                }
              >
                {hackathon.assetsReleased ? <EyeOff /> : <Eye />}
                {hackathon.assetsReleased ? "Hide assets" : "Release assets"}
              </ActionButton>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">ZIP password</p>
                <Badge variant={hackathon.passwordReleased ? "success" : "outline"}>
                  {hackathon.passwordReleased ? "Announced" : "Hidden"}
                </Badge>
              </div>
              {hackathon.assetZipPassword ? (
                <div className="mt-3">
                  <CopyField
                    value={hackathon.assetZipPassword}
                    label="ZIP password"
                    mask
                  />
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-amber-300">
                  No password set — save one above first.
                </p>
              )}
              <ActionButton
                action={togglePasswordRelease}
                fields={{ release: !hackathon.passwordReleased }}
                variant={hackathon.passwordReleased ? "secondary" : "default"}
                size="sm"
                className="mt-3"
                disabled={!hackathon.assetZipPassword}
                confirm={
                  hackathon.passwordReleased
                    ? {
                        title: "Hide the password?",
                        description: "It disappears from every contestant dashboard.",
                      }
                    : {
                        title: "Announce the ZIP password?",
                        description:
                          "It appears on every contestant dashboard instantly. This is the start gun.",
                        confirmLabel: "Announce it",
                      }
                }
              >
                <KeyRound />
                {hackathon.passwordReleased ? "Hide password" : "Announce password"}
              </ActionButton>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Judging &amp; results</CardTitle>
            <CardDescription>
              {ratingsSubmitted} scorecard{ratingsSubmitted === 1 ? "" : "s"} finalised
              across {assignmentsTotal} assignment{assignmentsTotal === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <ActionButton
                action={toggleJudgingLock}
                fields={{ lock: !hackathon.judgingLocked }}
                variant={hackathon.judgingLocked ? "secondary" : "default"}
                confirm={
                  hackathon.judgingLocked
                    ? {
                        title: "Reopen judging?",
                        description: "Judges can save and finalise scores again.",
                      }
                    : {
                        title: "Lock judging?",
                        description:
                          "All scoring freezes and ranks are recomputed from what exists now.",
                      }
                }
              >
                {hackathon.judgingLocked ? <Unlock /> : <Lock />}
                {hackathon.judgingLocked ? "Reopen judging" : "Lock judging"}
              </ActionButton>

              <ActionButton action={recomputeRanking} variant="secondary">
                <RefreshCw />
                Recompute ranking
              </ActionButton>
            </div>

            <div className="hairline" />

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={hackathon.resultsPublished ? "success" : "outline"}>
                {hackathon.resultsPublished ? "Results published" : "Results hidden"}
              </Badge>
              <ActionButton
                action={publishResults}
                fields={{ publish: !hackathon.resultsPublished }}
                variant={hackathon.resultsPublished ? "secondary" : "default"}
                confirm={
                  hackathon.resultsPublished
                    ? {
                        title: "Unpublish results?",
                        description:
                          "The public leaderboard and every scorecard go back into hiding.",
                      }
                    : {
                        title: "Publish results?",
                        description:
                          "The leaderboard goes public and every contestant is emailed their score and rank. Check the ranking first.",
                        confirmLabel: "Publish and notify",
                      }
                }
              >
                <Trophy />
                {hackathon.resultsPublished ? "Unpublish results" : "Publish results"}
              </ActionButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Gates right now: assets {gates.assetsVisible ? "visible" : "hidden"} ·
              password {gates.passwordVisible ? "visible" : "hidden"} · uploads{" "}
              {gates.uploadsOpen ? "open" : "closed"} · judging{" "}
              {gates.judgingOpen ? "open" : "closed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <ActionButton action={runReminderQueue} variant="secondary">
              <Send />
              Run email queue now
            </ActionButton>
            <Button asChild variant="secondary">
              <Link href="/admin/assignments">Assign submissions</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/reports">Export reports</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/leaderboard">Preview leaderboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
