import { Clock, ExternalLink, Upload, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActionButton } from "@/components/admin/action-button";
import { ReasonDialogButton } from "@/components/admin/reason-dialog-button";
import { WatchSubmissionDialog } from "@/components/admin/watch-submission-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { SubmissionStatusBadge } from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
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
import { getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatBytes, formatIST, formatScore } from "@/lib/utils";
import {
  rejectSubmission,
  restoreSubmission,
} from "@/server/actions/admin/contestants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Submissions" };

export default async function AdminSubmissionsPage() {
  await requireRole("ADMIN");
  const hackathon = await getActiveHackathon();
  if (!hackathon) return null;

  const submissions = await prisma.submission.findMany({
    where: { hackathonId: hackathon.id, status: { not: "NOT_SUBMITTED" } },
    orderBy: [{ uploadedAt: "desc" }],
    include: {
      contestant: {
        select: { contestantId: true, fullName: true, city: true, status: true },
      },
      // Only finalised scorecards count as reviewed. Counting every Rating row
      // included drafts, so a judge who had opened a submission and saved
      // nothing still read as having reviewed it.
      _count: {
        select: {
          ratings: { where: { isSubmitted: true } },
          assignments: true,
        },
      },
    },
  });

  const [received, late, rejected, pendingUpload] = await Promise.all([
    prisma.submission.count({
      where: { hackathonId: hackathon.id, status: "SUBMITTED" },
    }),
    prisma.submission.count({ where: { hackathonId: hackathon.id, status: "LATE" } }),
    prisma.submission.count({
      where: { hackathonId: hackathon.id, status: "REJECTED" },
    }),
    prisma.submission.count({
      where: { hackathonId: hackathon.id, status: "NOT_SUBMITTED" },
    }),
  ]);

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Submissions</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Submitted videos</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Each entry is an unlisted YouTube link on the contestant&apos;s own
          account. Older entries may still be Drive uploads.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Received" value={received} icon={Video} tone="emerald" />
        <StatCard label="Late" value={late} icon={Clock} tone="orange" />
        <StatCard label="Rejected" value={rejected} tone="rose" />
        <StatCard
          label="Not submitted"
          value={pendingUpload}
          icon={Upload}
          tone="neutral"
        />
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No uploads yet"
          description="Submissions appear here as contestants upload their final videos."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contestant</TableHead>
                <TableHead className="hidden lg:table-cell">File</TableHead>
                <TableHead className="hidden sm:table-cell">Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="text-right"
                  title="Judges who have submitted a final scorecard, out of those assigned"
                >
                  Reviewed
                </TableHead>
                <TableHead className="text-right">Avg</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <Link
                      href={`/admin/contestants/${submission.contestantId}`}
                      className="font-mono text-xs tracking-wider text-sky-300 hover:underline"
                    >
                      {submission.contestant.contestantId}
                    </Link>
                    <p className="mt-0.5 font-medium">
                      {submission.contestant.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {submission.contestant.city}
                    </p>
                  </TableCell>
                  <TableCell className="hidden max-w-[220px] lg:table-cell">
                    <p className="truncate font-mono text-xs">
                      {submission.fileName ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(submission.sizeBytes)}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                    {formatIST(submission.uploadedAt)}
                  </TableCell>
                  <TableCell>
                    <SubmissionStatusBadge status={submission.status} />
                    {submission.rejectedReason ? (
                      <p className="mt-1 max-w-[180px] text-xs text-rose-300/80">
                        {submission.rejectedReason}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    <span
                      className={
                        submission._count.assignments > 0 &&
                        submission._count.ratings >= submission._count.assignments
                          ? "font-semibold text-emerald-300"
                          : "text-muted-foreground"
                      }
                    >
                      {submission._count.ratings}/{submission._count.assignments}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-display font-semibold tabular-nums">
                    {formatScore(submission.averageScore)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {submission.youtubeVideoId || submission.previewUrl ? (
                        <WatchSubmissionDialog
                          contestantId={submission.contestant.contestantId}
                          contestantName={submission.contestant.fullName}
                          youtubeVideoId={submission.youtubeVideoId}
                          youtubeUrl={submission.youtubeUrl}
                          previewUrl={submission.previewUrl}
                          viewUrl={submission.videoUrl}
                        />
                      ) : null}
                      {(submission.youtubeUrl ?? submission.videoUrl) ? (
                        <Button asChild size="sm" variant="ghost">
                          <a
                            href={(submission.youtubeUrl ?? submission.videoUrl)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={
                              submission.youtubeUrl
                                ? "Open on YouTube"
                                : "Open in Drive"
                            }
                          >
                            <ExternalLink />
                          </a>
                        </Button>
                      ) : null}
                      {submission.status === "REJECTED" ? (
                        <ActionButton
                          action={restoreSubmission}
                          fields={{ submissionId: submission.id }}
                          size="sm"
                          variant="secondary"
                        >
                          Restore
                        </ActionButton>
                      ) : (
                        <ReasonDialogButton
                          action={rejectSubmission}
                          fields={{ submissionId: submission.id }}
                          title={`Reject ${submission.contestant.contestantId}'s submission?`}
                          description="It stops counting towards the leaderboard and the reason is shown on their dashboard."
                          label="Reject"
                          confirmLabel="Reject submission"
                          size="sm"
                          variant="ghost"
                          className="text-rose-300 hover:bg-rose-500/10"
                        />
                      )}
                    </div>
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
