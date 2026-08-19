import { Inbox, Lock, ShieldAlert } from "lucide-react";
import Link from "next/link";

import {
  AssignmentCard,
  type AssignmentCardData,
} from "@/components/judge/assignment-card";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { computeGates, getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JudgeQueuePage() {
  const user = await requireRole("JUDGE", "ADMIN");
  const hackathon = await getActiveHackathon();
  const gates = hackathon ? computeGates(hackathon) : null;

  if (!user.judgeId) {
    // Admins can open this portal, and most have no judge seat — that is normal,
    // not a misconfiguration, so it should not greet them with a warning about
    // their own account being broken.
    if (user.role === "ADMIN") {
      return (
        <Alert variant="info">
          <ShieldAlert />
          <div>
            <AlertTitle>This is the judging portal</AlertTitle>
            <AlertDescription>
              You&apos;re signed in as an admin, and admins don&apos;t score
              submissions &mdash; scores have to be attributable to a named judge.
              Nothing is wrong with your account.
              <span className="mt-3 block">
                <Link
                  href="/admin/ratings"
                  className="font-semibold text-sky-300 underline-offset-4 hover:underline"
                >
                  See every scorecard in the admin console
                </Link>
                , or add yourself on{" "}
                <Link
                  href="/admin/judges"
                  className="font-semibold text-sky-300 underline-offset-4 hover:underline"
                >
                  the Judges page
                </Link>{" "}
                using this email address to score as well.
              </span>
            </AlertDescription>
          </div>
        </Alert>
      );
    }

    return (
      <Alert variant="warning">
        <ShieldAlert />
        <div>
          <AlertTitle>No judge profile attached to your account</AlertTitle>
          <AlertDescription>
            Scores must be attributable to a named judge. Ask an admin to add you on the
            Judges page using this email address.
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  const assignments = await prisma.judgeAssignment.findMany({
    where: { judgeId: user.judgeId },
    orderBy: [{ completedAt: "asc" }, { assignedAt: "asc" }],
    include: {
      submission: {
        include: {
          contestant: {
            select: {
              contestantId: true,
              fullName: true,
              experienceYears: true,
              jobRole: true,
              city: true,
              portfolioUrl: true,
              status: true,
            },
          },
          ratings: {
            where: { judgeId: user.judgeId },
            select: { isSubmitted: true, overallScore: true },
          },
        },
      },
    },
  });

  const rows: AssignmentCardData[] = assignments
    .filter((assignment) => assignment.submission.contestant.status !== "DISQUALIFIED")
    .map((assignment) => {
      const rating = assignment.submission.ratings[0];
      return {
        submissionId: assignment.submission.id,
        contestantId: assignment.submission.contestant.contestantId,
        name: assignment.submission.contestant.fullName,
        experienceYears: assignment.submission.contestant.experienceYears,
        jobRole: assignment.submission.contestant.jobRole,
        city: assignment.submission.contestant.city,
        portfolioUrl: assignment.submission.contestant.portfolioUrl,
        uploadedAt: assignment.submission.uploadedAt,
        isLate: assignment.submission.isLate,
        hasDraft: Boolean(rating && !rating.isSubmitted),
        isSubmitted: Boolean(rating?.isSubmitted),
        overallScore: rating?.overallScore ?? null,
      };
    });

  const pending = rows.filter((row) => !row.isSubmitted);
  const done = rows.filter((row) => row.isSubmitted);

  return (
    <div className="space-y-7">
      <LiveRefresh />
      <div>
        <p className="label-eyebrow">Judge portal</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">My review queue</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Score each submission independently — please don&apos;t discuss entries with
          the other judges until scoring closes. Drafts are private to you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned to me" value={rows.length} tone="gold" />
        <StatCard label="Awaiting review" value={pending.length} tone="orange" />
        <StatCard label="Submitted" value={done.length} tone="emerald" />
      </div>

      {hackathon?.judgingLocked ? (
        <Alert variant="warning">
          <Lock />
          <div>
            <AlertTitle>Judging is locked</AlertTitle>
            <AlertDescription>
              Scoring is frozen by the organisers. Your submitted scorecards are
              read-only.
            </AlertDescription>
          </div>
        </Alert>
      ) : !gates?.judgingOpen && hackathon ? (
        <Alert variant="info">
          <Lock />
          <div>
            <AlertTitle>Judging isn&apos;t open yet</AlertTitle>
            <AlertDescription>
              The event is in the {hackathon.status.replace(/_/g, " ").toLowerCase()}{" "}
              phase. Judging opens after the submission deadline
              {` (${formatIST(hackathon.submissionDeadline)} IST)`}. You can browse but
              not save scores.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing assigned yet"
          description="Submissions appear here once the organisers assign them to you — usually right after the deadline."
        />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold">
                To review ({pending.length})
              </h2>
              {pending.map((row) => (
                <AssignmentCard key={row.submissionId} data={row} />
              ))}
            </section>
          ) : null}

          {done.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold">
                Submitted ({done.length})
              </h2>
              {done.map((row) => (
                <AssignmentCard key={row.submissionId} data={row} />
              ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
