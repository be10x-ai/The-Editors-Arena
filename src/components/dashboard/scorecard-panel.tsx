import { ClipboardList, Lock } from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { RATING_CRITERIA } from "@/lib/constants";
import { criteriaAverages } from "@/lib/scoring";
import { formatIST, formatScore } from "@/lib/utils";
import type { CriterionScores } from "@/lib/scoring";

type ScorecardRating = CriterionScores & {
  id: string;
  overallScore: number;
  feedback: {
    comment: string | null;
    strengths: string | null;
    weaknesses: string | null;
  } | null;
};

/**
 * A participant's own scorecard, shared by the dashboard overview and the
 * standalone route. Judge identities are never shown — feedback is attributed as
 * "Judge 1…N" so the panel can be candid.
 */
export function ScorecardPanel({
  finalScore,
  rank,
  isWinner,
  isRunnerUp,
  ratings,
  released,
  resultsAt,
}: {
  finalScore: number | null;
  rank: number | null;
  isWinner: boolean;
  isRunnerUp: boolean;
  ratings: ScorecardRating[];
  released: boolean;
  resultsAt: Date;
}) {
  if (!released) {
    return (
      <EmptyState
        icon={Lock}
        title="Your scorecard isn't published yet"
        description={`Judging closes and results are released on ${formatIST(resultsAt)} IST — 60 minutes after the submission deadline.`}
      />
    );
  }

  if (ratings.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No finalised scores yet"
        description="No judge has finalised a scorecard for your submission. If you believe your entry was missed, contact the organisers with your contestant ID."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Final score"
          value={`${formatScore(finalScore)} / 10`}
          hint={`Average of ${ratings.length} judge${ratings.length === 1 ? "" : "s"}`}
          tone="gold"
        />
        <StatCard
          label="Rank"
          value={rank ? `#${rank}` : "—"}
          hint={isWinner ? "Champion" : isRunnerUp ? "Runner-up" : "Overall position"}
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
                  <p className="mt-1 text-sm leading-relaxed text-sky-200/90">
                    {rating.feedback.weaknesses}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
