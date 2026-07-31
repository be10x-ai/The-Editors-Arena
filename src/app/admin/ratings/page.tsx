import { Star, Unlock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActionButton } from "@/components/admin/action-button";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
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
import { HIRING_RECOMMENDATION_META, RATING_CRITERIA } from "@/lib/constants";
import { getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { judgeSpread } from "@/lib/scoring";
import { formatIST, truncate } from "@/lib/utils";
import { unlockRating } from "@/server/actions/admin/judges";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ratings" };

export default async function AdminRatingsPage() {
  await requireRole("ADMIN");
  const hackathon = await getActiveHackathon();
  if (!hackathon) return null;

  const ratings = await prisma.rating.findMany({
    where: { submission: { hackathonId: hackathon.id } },
    orderBy: [{ isSubmitted: "desc" }, { updatedAt: "desc" }],
    include: {
      judge: { select: { name: true } },
      feedback: true,
      submission: {
        select: {
          id: true,
          averageScore: true,
          contestant: { select: { contestantId: true, fullName: true } },
        },
      },
    },
  });

  const submitted = ratings.filter((rating) => rating.isSubmitted);
  const drafts = ratings.length - submitted.length;

  // Calibration signal: which submissions have judges furthest apart?
  const bySubmission = new Map<string, number[]>();
  for (const rating of submitted) {
    const list = bySubmission.get(rating.submission.id) ?? [];
    list.push(rating.overallScore);
    bySubmission.set(rating.submission.id, list);
  }
  const widest = [...bySubmission.entries()]
    .map(([submissionId, scores]) => ({
      submissionId,
      spread: judgeSpread(scores) ?? 0,
      contestantId:
        submitted.find((rating) => rating.submission.id === submissionId)?.submission
          .contestant.contestantId ?? "",
    }))
    .filter((row) => row.spread > 2)
    .sort((a, b) => b.spread - a.spread)
    .slice(0, 5);

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Judging</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Ratings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every scorecard, draft or final. Unlocking a submitted scorecard removes it
          from the average until the judge resubmits.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Submitted"
          value={submitted.length}
          icon={Star}
          tone="emerald"
        />
        <StatCard label="Drafts in progress" value={drafts} tone="orange" />
        <StatCard
          label="Wide disagreements"
          value={widest.length}
          hint="Judges more than 2 points apart"
          tone={widest.length > 0 ? "rose" : "neutral"}
        />
      </div>

      {widest.length > 0 ? (
        <Card className="border-amber-500/25 bg-amber-500/[0.06] p-5">
          <p className="text-sm font-semibold text-amber-200">
            Worth a calibration conversation
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/80">
            {widest.map((row) => (
              <li key={row.submissionId}>
                <span className="font-mono text-xs">{row.contestantId}</span> — judges
                differ by {row.spread.toFixed(1)} points
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {ratings.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No scorecards yet"
          description="Ratings appear here as judges save drafts and submit reviews."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submission</TableHead>
                <TableHead>Judge</TableHead>
                {RATING_CRITERIA.map((criterion) => (
                  <TableHead
                    key={criterion.key}
                    className="hidden text-right xl:table-cell"
                  >
                    {criterion.label.split(" ")[0]}
                  </TableHead>
                ))}
                <TableHead className="text-right">Overall</TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  Weighted
                </TableHead>
                <TableHead>State</TableHead>
                <TableHead className="hidden xl:table-cell">Recommendation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratings.map((rating) => (
                <TableRow key={rating.id}>
                  <TableCell>
                    <p className="font-mono text-xs tracking-wider text-amber-300">
                      {rating.submission.contestant.contestantId}
                    </p>
                    <p className="mt-0.5 max-w-[150px] truncate text-sm">
                      {rating.submission.contestant.fullName}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{rating.judge.name}</TableCell>
                  {RATING_CRITERIA.map((criterion) => (
                    <TableCell
                      key={criterion.key}
                      className="hidden text-right tabular-nums text-muted-foreground xl:table-cell"
                    >
                      {rating[criterion.key].toFixed(1)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-display font-bold tabular-nums">
                    {rating.overallScore.toFixed(1)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                    {rating.computedScore.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {rating.isSubmitted ? (
                      <Badge variant="success">Locked</Badge>
                    ) : (
                      <Badge variant="warning">Draft</Badge>
                    )}
                    {rating.unlockedAt ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        unlocked {formatIST(rating.unlockedAt)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {rating.feedback ? (
                      <>
                        <Badge variant="outline">
                          {
                            HIRING_RECOMMENDATION_META[rating.feedback.recommendation]
                              .label
                          }
                        </Badge>
                        <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                          {truncate(rating.feedback.comment, 90)}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/judge/review/${rating.submission.id}`}>View</Link>
                      </Button>
                      {rating.isSubmitted ? (
                        <ActionButton
                          action={unlockRating}
                          fields={{ ratingId: rating.id }}
                          size="sm"
                          variant="ghost"
                          confirm={{
                            title: "Unlock this scorecard?",
                            description:
                              "The score stops counting immediately, ranks are recomputed, and the judge can edit and resubmit.",
                            confirmLabel: "Unlock",
                          }}
                        >
                          <Unlock />
                        </ActionButton>
                      ) : null}
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
