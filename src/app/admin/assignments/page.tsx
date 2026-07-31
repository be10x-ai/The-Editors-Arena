import { CheckCircle2, Shuffle, Video } from "lucide-react";
import type { Metadata } from "next";

import { ActionButton } from "@/components/admin/action-button";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { autoAssignSubmissions, toggleAssignment } from "@/server/actions/admin/judges";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Assignments" };

/**
 * Judge × submission matrix. Each cell toggles one assignment; the auto-assign
 * button fans every submission out to `judgesPerSubmission` judges round-robin.
 */
export default async function AdminAssignmentsPage() {
  await requireRole("ADMIN");
  const hackathon = await getActiveHackathon();
  if (!hackathon) return null;

  const [judges, submissions] = await Promise.all([
    prisma.judge.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.submission.findMany({
      where: { hackathonId: hackathon.id, status: { in: ["SUBMITTED", "LATE"] } },
      orderBy: { uploadedAt: "asc" },
      include: {
        contestant: { select: { contestantId: true, fullName: true } },
        assignments: { select: { judgeId: true, completedAt: true } },
        ratings: { select: { judgeId: true, isSubmitted: true } },
      },
    }),
  ]);

  const totalAssignments = submissions.reduce(
    (sum, submission) => sum + submission.assignments.length,
    0,
  );
  const completed = submissions.reduce(
    (sum, submission) =>
      sum + submission.ratings.filter((rating) => rating.isSubmitted).length,
    0,
  );
  const perSubmission = Math.min(hackathon.judgesPerSubmission, judges.length || 1);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow">Judging</p>
          <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Assignments</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Target is {hackathon.judgesPerSubmission} judges per submission
            (configurable in Settings).
          </p>
        </div>
        <ActionButton
          action={autoAssignSubmissions}
          confirm={{
            title: "Auto-assign every submission?",
            description: `Each of the ${submissions.length} submissions is assigned to ${perSubmission} judge${perSubmission === 1 ? "" : "s"}, round-robin. Existing assignments are kept.`,
            confirmLabel: "Assign",
          }}
        >
          <Shuffle />
          Auto-assign
        </ActionButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Submissions"
          value={submissions.length}
          icon={Video}
          tone="steel"
        />
        <StatCard label="Assignments" value={totalAssignments} tone="gold" />
        <StatCard
          label="Completed reviews"
          value={completed}
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      {judges.length === 0 ? (
        <Alert variant="warning">
          <AlertTitle>No active judges</AlertTitle>
          <AlertDescription>Add judges before assigning submissions.</AlertDescription>
        </Alert>
      ) : null}

      {submissions.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No submissions to assign"
          description="Assignments become available once contestants upload their videos."
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Judge matrix</CardTitle>
            <CardDescription>
              Click a cell to assign or unassign. A submitted scorecard cannot be
              unassigned until an admin unlocks it.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-[#141311]">
                    Submission
                  </TableHead>
                  {judges.map((judge) => (
                    <TableHead key={judge.id} className="text-center">
                      {judge.name.split(" ")[0]}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => {
                  const assignedIds = new Set(
                    submission.assignments.map((assignment) => assignment.judgeId),
                  );
                  const submittedIds = new Set(
                    submission.ratings
                      .filter((rating) => rating.isSubmitted)
                      .map((rating) => rating.judgeId),
                  );

                  return (
                    <TableRow key={submission.id}>
                      <TableCell className="sticky left-0 bg-[#141311]">
                        <p className="font-mono text-xs tracking-wider text-amber-300">
                          {submission.contestant.contestantId}
                        </p>
                        <p className="mt-0.5 max-w-[160px] truncate text-sm">
                          {submission.contestant.fullName}
                        </p>
                      </TableCell>

                      {judges.map((judge) => {
                        const assigned = assignedIds.has(judge.id);
                        const scored = submittedIds.has(judge.id);
                        return (
                          <TableCell key={judge.id} className="text-center">
                            <ActionButton
                              action={toggleAssignment}
                              fields={{
                                judgeId: judge.id,
                                submissionId: submission.id,
                                assign: !assigned,
                              }}
                              size="sm"
                              variant="ghost"
                              className={
                                scored
                                  ? "text-emerald-300"
                                  : assigned
                                    ? "text-amber-300"
                                    : "text-muted-foreground/50"
                              }
                              aria-label={
                                assigned
                                  ? `Unassign ${judge.name}`
                                  : `Assign ${judge.name}`
                              }
                            >
                              {scored ? "✓✓" : assigned ? "✓" : "—"}
                            </ActionButton>
                          </TableCell>
                        );
                      })}

                      <TableCell className="text-right tabular-nums">
                        <span
                          className={
                            assignedIds.size >= hackathon.judgesPerSubmission
                              ? "text-emerald-300"
                              : "text-amber-300"
                          }
                        >
                          {assignedIds.size}/{hackathon.judgesPerSubmission}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
