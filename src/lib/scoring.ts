import type { Rating } from "@prisma/client";

import { PODIUM_SIZE, RATING_CRITERIA } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { round } from "@/lib/utils";

export type CriterionScores = Pick<
  Rating,
  | "creativity"
  | "storytelling"
  | "editingSkill"
  | "motionGraphics"
  | "soundDesign"
  | "technicalQuality"
>;

/**
 * Weighted mean of the six criteria, on the same 0–10 scale.
 * Stored as `Rating.computedScore` so admins can see when a judge's holistic
 * score drifts from their own criteria marks.
 */
export function weightedCriteriaScore(scores: CriterionScores): number {
  const total = RATING_CRITERIA.reduce(
    (sum, criterion) => sum + scores[criterion.key] * criterion.weight,
    0,
  );
  return round(total, 2);
}

export function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((a, b) => a + b, 0) / values.length, 2);
}

/**
 * Recomputes a single submission's average from its finalised ratings.
 *
 * Only submitted (locked) ratings count — a judge's half-finished draft must
 * never move the leaderboard.
 */
export async function recalculateSubmissionScore(submissionId: string) {
  const ratings = await prisma.rating.findMany({
    where: { submissionId, isSubmitted: true },
    select: { overallScore: true },
  });

  const average = averageOf(ratings.map((r) => r.overallScore));

  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data: { averageScore: average, ratingsCount: ratings.length },
    select: { id: true, contestantId: true, averageScore: true },
  });

  await prisma.contestant.update({
    where: { id: submission.contestantId },
    data: { finalScore: average },
  });

  return submission;
}

export type LeaderboardRow = {
  rank: number;
  contestantRowId: string;
  contestantId: string;
  name: string;
  city: string;
  experienceYears: number;
  portfolioUrl: string;
  averageScore: number;
  ratingsCount: number;
  isWinner: boolean;
  isRunnerUp: boolean;
};

/**
 * Ranking engine.
 *
 * Ties: contestants with identical averages share a rank (1, 2, 2, 4) and the
 * next rank skips accordingly — standard competition ranking. Secondary sort is
 * earliest upload, so a tie is at least deterministic on screen.
 */
export async function computeRanking(hackathonId: string): Promise<LeaderboardRow[]> {
  const submissions = await prisma.submission.findMany({
    where: {
      hackathonId,
      status: { in: ["SUBMITTED", "LATE"] },
      averageScore: { not: null },
      contestant: { status: { not: "DISQUALIFIED" } },
    },
    select: {
      id: true,
      averageScore: true,
      ratingsCount: true,
      uploadedAt: true,
      contestant: {
        select: {
          id: true,
          contestantId: true,
          fullName: true,
          city: true,
          experienceYears: true,
          portfolioUrl: true,
        },
      },
    },
  });

  const sorted = submissions.sort((a, b) => {
    const diff = (b.averageScore ?? 0) - (a.averageScore ?? 0);
    if (Math.abs(diff) > 1e-9) return diff;
    return (a.uploadedAt?.getTime() ?? 0) - (b.uploadedAt?.getTime() ?? 0);
  });

  const rows: LeaderboardRow[] = [];
  let previousScore: number | null = null;
  let previousRank = 0;

  sorted.forEach((submission, index) => {
    const score = round(submission.averageScore ?? 0, 2);
    const rank =
      previousScore !== null && Math.abs(previousScore - score) < 1e-9
        ? previousRank
        : index + 1;

    previousScore = score;
    previousRank = rank;

    rows.push({
      rank,
      contestantRowId: submission.contestant.id,
      contestantId: submission.contestant.contestantId,
      name: submission.contestant.fullName,
      city: submission.contestant.city,
      experienceYears: submission.contestant.experienceYears,
      portfolioUrl: submission.contestant.portfolioUrl,
      averageScore: score,
      ratingsCount: submission.ratingsCount,
      isWinner: rank === 1,
      isRunnerUp: rank > 1 && rank <= PODIUM_SIZE,
    });
  });

  return rows;
}

/**
 * Persists ranks and podium badges. Idempotent: safe to run after every rating.
 * Contestants who fall off the board have their rank cleared, so a stale
 * "Rank 3" badge can never survive a rescore.
 */
export async function persistRanking(hackathonId: string): Promise<LeaderboardRow[]> {
  const rows = await computeRanking(hackathonId);
  const rankedIds = rows.map((r) => r.contestantRowId);

  await prisma.$transaction([
    prisma.contestant.updateMany({
      where: {
        hackathonId,
        ...(rankedIds.length ? { id: { notIn: rankedIds } } : {}),
      },
      data: { rank: null, isWinner: false, isRunnerUp: false },
    }),
    ...rows.map((row) =>
      prisma.contestant.update({
        where: { id: row.contestantRowId },
        data: {
          rank: row.rank,
          finalScore: row.averageScore,
          isWinner: row.isWinner,
          isRunnerUp: row.isRunnerUp,
        },
      }),
    ),
  ]);

  return rows;
}

/** Per-criterion averages across judges — used by the hiring report. */
export function criteriaAverages(ratings: CriterionScores[]) {
  return RATING_CRITERIA.map((criterion) => ({
    key: criterion.key,
    label: criterion.label,
    weight: criterion.weight,
    average: averageOf(ratings.map((r) => r[criterion.key])) ?? 0,
  }));
}

/**
 * Derives strengths/weaknesses when judges leave those fields blank: the two
 * highest and two lowest criteria averages.
 */
export function derivedStrengthsWeaknesses(ratings: CriterionScores[]) {
  const averages = criteriaAverages(ratings).sort((a, b) => b.average - a.average);
  return {
    strengths: averages.slice(0, 2).map((a) => `${a.label} (${a.average.toFixed(1)})`),
    weaknesses: averages
      .slice(-2)
      .reverse()
      .map((a) => `${a.label} (${a.average.toFixed(1)})`),
  };
}

/** Spread between the harshest and most generous judge — flags calibration gaps. */
export function judgeSpread(overallScores: number[]): number | null {
  if (overallScores.length < 2) return null;
  return round(Math.max(...overallScores) - Math.min(...overallScores), 2);
}
