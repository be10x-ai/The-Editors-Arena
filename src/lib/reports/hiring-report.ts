import type { HiringRecommendation } from "@prisma/client";

import { RATING_CRITERIA } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  averageOf,
  criteriaAverages,
  derivedStrengthsWeaknesses,
  judgeSpread,
} from "@/lib/scoring";

export type JudgeScorecard = {
  judgeName: string;
  judgeTitle: string | null;
  scores: Record<string, number>;
  overallScore: number;
  computedScore: number;
  comment: string;
  strengths: string | null;
  weaknesses: string | null;
  recommendation: HiringRecommendation;
  submittedAt: Date | null;
};

export type HiringReportRow = {
  rank: number | null;
  contestantId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  experienceYears: number;
  jobRole: string;
  softwareSkills: string[];
  portfolioUrl: string;
  linkedinUrl: string | null;
  socialUrl: string | null;
  submissionStatus: string;
  videoUrl: string | null;
  uploadedAt: Date | null;
  finalScore: number | null;
  judgeCount: number;
  spread: number | null;
  criteriaAverages: { key: string; label: string; weight: number; average: number }[];
  strengths: string[];
  weaknesses: string[];
  recommendation: HiringRecommendation;
  judges: JudgeScorecard[];
};

export type HiringReport = {
  hackathonName: string;
  generatedAt: Date;
  totalRegistered: number;
  totalSubmitted: number;
  totalJudged: number;
  rows: HiringReportRow[];
};

/** Order from most to least positive — used to break ties conservatively. */
const RECOMMENDATION_ORDER: HiringRecommendation[] = [
  "STRONG_HIRE",
  "HIRE",
  "FREELANCE_ROSTER",
  "KEEP_WARM",
  "NO_HIRE",
];

/**
 * Consensus recommendation across judges: the most common answer, and on a tie
 * the more conservative of the tied options.
 */
export function aggregateRecommendation(
  recommendations: HiringRecommendation[],
): HiringRecommendation {
  if (recommendations.length === 0) return "KEEP_WARM";

  const counts = new Map<HiringRecommendation, number>();
  for (const recommendation of recommendations) {
    counts.set(recommendation, (counts.get(recommendation) ?? 0) + 1);
  }

  const max = Math.max(...counts.values());
  const tied = RECOMMENDATION_ORDER.filter((r) => counts.get(r) === max);
  return tied[tied.length - 1] ?? "KEEP_WARM";
}

/**
 * Assembles the post-event hiring evaluation for every contestant who submitted.
 * Only finalised ratings are included — a draft scorecard is not evidence.
 */
export async function buildHiringReport(hackathonId: string): Promise<HiringReport> {
  const hackathon = await prisma.hackathon.findUniqueOrThrow({
    where: { id: hackathonId },
    select: { name: true },
  });

  const [totalRegistered, contestants] = await Promise.all([
    prisma.contestant.count({ where: { hackathonId } }),
    prisma.contestant.findMany({
      where: { hackathonId, submission: { status: { in: ["SUBMITTED", "LATE"] } } },
      orderBy: [{ rank: "asc" }, { finalScore: "desc" }, { contestantId: "asc" }],
      include: {
        submission: {
          include: {
            ratings: {
              where: { isSubmitted: true },
              include: {
                judge: { select: { name: true, title: true } },
                feedback: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    }),
  ]);

  const rows: HiringReportRow[] = contestants.map((contestant) => {
    const ratings = contestant.submission?.ratings ?? [];

    const judges: JudgeScorecard[] = ratings.map((rating) => ({
      judgeName: rating.judge.name,
      judgeTitle: rating.judge.title,
      scores: Object.fromEntries(
        RATING_CRITERIA.map((criterion) => [criterion.key, rating[criterion.key]]),
      ),
      overallScore: rating.overallScore,
      computedScore: rating.computedScore,
      comment: rating.feedback?.comment ?? "",
      strengths: rating.feedback?.strengths ?? null,
      weaknesses: rating.feedback?.weaknesses ?? null,
      recommendation: rating.feedback?.recommendation ?? "KEEP_WARM",
      submittedAt: rating.submittedAt,
    }));

    const derived = derivedStrengthsWeaknesses(ratings);

    // Judge-written strengths win; the criteria-derived pair is the fallback.
    const writtenStrengths = judges
      .map((judge) => judge.strengths?.trim())
      .filter((value): value is string => Boolean(value));
    const writtenWeaknesses = judges
      .map((judge) => judge.weaknesses?.trim())
      .filter((value): value is string => Boolean(value));

    return {
      rank: contestant.rank,
      contestantId: contestant.contestantId,
      name: contestant.fullName,
      email: contestant.email,
      phone: contestant.phone,
      city: contestant.city,
      experienceYears: contestant.experienceYears,
      jobRole: contestant.jobRole,
      softwareSkills: contestant.softwareSkills,
      portfolioUrl: contestant.portfolioUrl,
      linkedinUrl: contestant.linkedinUrl,
      socialUrl: contestant.socialUrl,
      submissionStatus: contestant.submission?.status ?? "NOT_SUBMITTED",
      videoUrl: contestant.submission?.videoUrl ?? null,
      uploadedAt: contestant.submission?.uploadedAt ?? null,
      finalScore:
        contestant.finalScore ?? averageOf(ratings.map((r) => r.overallScore)),
      judgeCount: ratings.length,
      spread: judgeSpread(ratings.map((r) => r.overallScore)),
      criteriaAverages: criteriaAverages(ratings),
      strengths: writtenStrengths.length ? writtenStrengths : derived.strengths,
      weaknesses: writtenWeaknesses.length ? writtenWeaknesses : derived.weaknesses,
      recommendation: aggregateRecommendation(judges.map((j) => j.recommendation)),
      judges,
    };
  });

  return {
    hackathonName: hackathon.name,
    generatedAt: new Date(),
    totalRegistered,
    totalSubmitted: rows.length,
    totalJudged: rows.filter((row) => row.judgeCount > 0).length,
    rows,
  };
}
