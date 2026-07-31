import { ClipboardList, Lock } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { RATING_CRITERIA } from "@/lib/constants";
import { getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { criteriaAverages } from "@/lib/scoring";
import { formatIST, formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My scorecard" };

/**
 * A participant's own scorecard. Judge identities are not shown — feedback is
 * attributed as "Judge 1…N" so the panel can be candid.
 */
export default async function ScorecardPage() {
  const user = await requireRole("CONTESTANT");
  const hackathon = await getActiveHackathon();
  if (!hackathon) redirect("/dashboard");

  const contestant = await prisma.contestant.findUnique({
    where: { id: user.contestantRowId ?? "" },
    include: {
      submission: {
        include: {
          ratings: {
            where: { isSubmitted: true },
            include: { feedback: true },
            orderBy: { submittedAt: "asc" },
          },
        },
      },
    },
  });
  if (!contestant) redirect("/dashboard");

  const ratings = contestant.submission?.ratings ?? [];
  const released = hackathon.resultsPublished;

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Results</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">My scorecard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every participant gets a full breakdown — six criteria, each judge&apos;s
          overall mark, and their written feedback.
        </p>
      </div>

      {!released ? (
        <EmptyState
          icon={Lock}
          title="Your scorecard isn't published yet"
          description={`Judging closes and results are released on ${formatIST(hackathon.resultsAt)} IST. You'll get an email the moment it's live.`}
        />
      ) : ratings.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No finalised scores yet"
          description="No judge has finalised a scorecard for your submission. If you believe your entry was missed, contact the organisers with your contestant ID."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Final score"
              value={`${formatScore(contestant.finalScore)} / 10`}
              hint={`Average of ${ratings.length} judge${ratings.length === 1 ? "" : "s"}`}
              tone="gold"
            />
            <StatCard
              label="Rank"
              value={contestant.rank ? `#${contestant.rank}` : "—"}
              hint={
                contestant.isWinner
                  ? "Champion"
                  : contestant.isRunnerUp
                    ? "Runner-up"
                    : "Overall position"
              }
              tone="orange"
            />
            <StatCard
              label="Judges"
              value={ratings.length}
              hint="Scored independently"
              tone="steel"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Criteria breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {criteriaAverages(ratings).map((criterion) => (
                <div key={criterion.key}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-sm font-medium">
                      {criterion.label}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {Math.round(criterion.weight * 100)}%
                      </span>
                    </p>
                    <p className="font-display text-sm font-bold tabular-nums">
                      {criterion.average.toFixed(1)}
                      <span className="text-muted-foreground"> / 10</span>
                    </p>
                  </div>
                  <Progress value={criterion.average * 10} className="mt-2" />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {RATING_CRITERIA.find((c) => c.key === criterion.key)?.help}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Judge feedback</h2>
            {ratings.map((rating, index) => (
              <Card key={rating.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle>Judge {index + 1}</CardTitle>
                    <p className="font-display text-lg font-bold tabular-nums">
                      {rating.overallScore.toFixed(1)}
                      <span className="text-sm font-medium text-muted-foreground">
                        {" "}
                        / 10
                      </span>
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {RATING_CRITERIA.map((criterion) => (
                      <div
                        key={criterion.key}
                        className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2"
                      >
                        <p className="text-[11px] text-muted-foreground">
                          {criterion.label}
                        </p>
                        <p className="font-display text-sm font-bold tabular-nums">
                          {rating[criterion.key].toFixed(1)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {rating.feedback?.comment ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {rating.feedback.comment}
                    </p>
                  ) : null}

                  {rating.feedback?.strengths ? (
                    <div>
                      <p className="label-eyebrow">Strengths</p>
                      <p className="mt-1 text-sm leading-relaxed text-emerald-200/90">
                        {rating.feedback.strengths}
                      </p>
                    </div>
                  ) : null}

                  {rating.feedback?.weaknesses ? (
                    <div>
                      <p className="label-eyebrow">To work on</p>
                      <p className="mt-1 text-sm leading-relaxed text-amber-200/90">
                        {rating.feedback.weaknesses}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
