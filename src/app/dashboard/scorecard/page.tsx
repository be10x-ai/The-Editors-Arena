import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ScorecardPanel } from "@/components/dashboard/scorecard-panel";
import { getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

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

      <ScorecardPanel
        finalScore={contestant.finalScore}
        rank={contestant.rank}
        isWinner={contestant.isWinner}
        isRunnerUp={contestant.isRunnerUp}
        ratings={ratings}
        released={released}
        resultsAt={hackathon.resultsAt}
      />
    </div>
  );
}
