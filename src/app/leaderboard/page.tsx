import { Lock, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LogoLockup } from "@/components/shared/logo";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { Footer } from "@/components/landing/footer";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { EventStatusBadge } from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { computeGates, getActiveHackathon } from "@/lib/hackathon";
import { homeFor } from "@/lib/rbac";
import { computeRanking } from "@/lib/scoring";
import { formatIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Live results for The Editor's Arena — ranks, average scores, winner and runners-up.",
};

export default async function LeaderboardPage() {
  const [hackathon, session] = await Promise.all([getActiveHackathon(), auth()]);

  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "JUDGE";
  const gates = hackathon ? computeGates(hackathon) : null;
  const visible = Boolean(gates?.resultsVisible) || isStaff;

  const rows = hackathon && visible ? await computeRanking(hackathon.id) : [];

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="aurora absolute inset-x-0 top-0 h-80" />

      <header className="relative z-10 border-b border-white/10">
        <div className="container flex h-16 items-center justify-between">
          <LogoLockup size={42} priority />
          <div className="flex items-center gap-2 sm:gap-3">
            {hackathon ? (
              <span className="hidden sm:block">
                <EventStatusBadge status={hackathon.status} />
              </span>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Home</Link>
            </Button>
            {session?.user ? (
              <>
                <Button asChild size="sm">
                  <Link href={homeFor(session.user.role)}>My dashboard</Link>
                </Button>
                <SignOutButton />
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                {gates?.registrationOpen ? (
                  <Button asChild size="sm">
                    <Link href="/register">Register Now</Link>
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container relative z-10 py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-eyebrow">Results</p>
            <h1 className="type-arena mt-3 block pb-1 text-[2.3rem] leading-[1] sm:text-5xl">
              Leaderboard
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Final score is the average of every judge&apos;s overall mark, to two
              decimals. Ties share a rank.
            </p>
          </div>
          {hackathon ? (
            <p className="text-sm text-muted-foreground">
              Results scheduled for{" "}
              <span className="font-semibold text-foreground">
                {formatIST(hackathon.resultsAt)} IST
              </span>
            </p>
          ) : null}
        </div>

        <div className="mt-10">
          {!hackathon ? (
            <EmptyState
              icon={Trophy}
              title="No active edition"
              description="Once a hackathon is configured, its leaderboard appears here."
            />
          ) : !visible ? (
            <EmptyState
              icon={Lock}
              title="Results aren't published yet"
              description={`Judging closes and results go live on ${formatIST(hackathon.resultsAt)} IST. Every participant also receives an individual scorecard by email.`}
              action={
                <Button asChild variant="secondary">
                  <Link href="/">Back to the arena</Link>
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No scored submissions yet"
              description={
                isStaff
                  ? "Ranks appear as soon as judges finalise their scorecards."
                  : "Check back once judging is complete."
              }
            />
          ) : (
            <>
              {!gates?.resultsVisible && isStaff ? (
                <p className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Staff preview — these results are not public yet.
                </p>
              ) : null}
              <LeaderboardTable
                rows={rows}
                highlightContestantId={session?.user?.contestantId ?? null}
              />
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
