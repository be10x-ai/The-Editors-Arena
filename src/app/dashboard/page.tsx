import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Upload,
  Youtube,
} from "lucide-react";
import { redirect } from "next/navigation";

import { AssetCard } from "@/components/dashboard/asset-card";
import { ScorecardPanel } from "@/components/dashboard/scorecard-panel";
import { YoutubeSubmitForm } from "@/components/dashboard/youtube-submit-form";
import { CountdownTimer } from "@/components/landing/countdown-timer";
import { CopyField } from "@/components/shared/copy-field";
import { StatCard } from "@/components/shared/stat-card";
import {
  ContestantStatusBadge,
  SubmissionStatusBadge,
} from "@/components/shared/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeGates, countdownTarget, getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { requireRole } from "@/lib/rbac";
import { formatIST, formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContestantDashboard() {
  const user = await requireRole("CONTESTANT");
  const hackathon = await getActiveHackathon();
  if (!hackathon) redirect("/");

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
      hackathon: { select: { timezone: true } },
    },
  });

  if (!contestant) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <div>
          <AlertTitle>We can&apos;t find your entry</AlertTitle>
          <AlertDescription>
            Your account exists but has no contestant record for this edition. Contact
            the organisers so they can fix it.
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  const gates = computeGates(hackathon);
  const countdown = countdownTarget(hackathon);
  const submission = contestant.submission;
  const hasSubmitted =
    submission?.status === "SUBMITTED" || submission?.status === "LATE";
  const firstName = contestant.fullName.split(" ")[0];

  const timeline = await prisma.timelineEvent.findMany({
    where: { hackathonId: hackathon.id, isPublished: true },
    orderBy: { order: "asc" },
    take: 8,
  });

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-eyebrow">Contestant dashboard</p>
          <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ContestantStatusBadge status={contestant.status} />
            {submission ? <SubmissionStatusBadge status={submission.status} /> : null}
            {contestant.rank && hackathon.resultsPublished ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                Rank #{contestant.rank}
              </span>
            ) : null}
          </div>
        </div>

        <div className="w-full max-w-[260px]">
          <p className="label-eyebrow mb-2">Your contestant ID</p>
          <CopyField value={contestant.contestantId} label="Contestant ID" />
        </div>
      </div>

      {contestant.status === "DISQUALIFIED" ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <div>
            <AlertTitle>Your entry has been disqualified</AlertTitle>
            <AlertDescription>
              {contestant.disqualifiedReason ??
                "Contact the organisers if you believe this is a mistake."}
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <CountdownTimer
            target={countdown.target}
            label={countdown.label}
            reachedLabel={countdown.reachedLabel}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Event day"
          value={formatIST(hackathon.startsAt, { hour: undefined, minute: undefined })}
          hint={`Starts ${formatIST(hackathon.startsAt, { day: undefined, month: undefined, year: undefined })} IST`}
          icon={CalendarClock}
        />
        <StatCard
          label="Submission deadline"
          value={formatIST(hackathon.submissionDeadline, {
            day: undefined,
            month: undefined,
            year: undefined,
          })}
          hint={formatIST(hackathon.submissionDeadline)}
          icon={Clock}
          tone="orange"
        />
        <StatCard
          label="Submission"
          value={hasSubmitted ? "Received" : "Pending"}
          hint={
            submission?.uploadedAt
              ? formatIST(submission.uploadedAt)
              : gates.uploadsOpen
                ? "Uploads are open"
                : "Opens on event day"
          }
          icon={hasSubmitted ? CheckCircle2 : Upload}
          tone={hasSubmitted ? "emerald" : "neutral"}
        />
        <StatCard
          label="Final score"
          value={
            hackathon.resultsPublished && contestant.finalScore !== null
              ? formatScore(contestant.finalScore)
              : "—"
          }
          hint={
            hackathon.resultsPublished
              ? `${submission?.ratingsCount ?? 0} judge scorecards`
              : "Published with results"
          }
          icon={CheckCircle2}
          tone="gold"
        />
      </div>

      <AssetCard
        gates={gates}
        zipName={hackathon.assetZipName}
        driveUrl={hackathon.assetDriveUrl}
        password={gates.passwordVisible ? hackathon.assetZipPassword : null}
        startsAt={hackathon.startsAt}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasSubmitted && submission ? (
              <>
                {/* The submitted edit, playable in place — the entrant should be
                    able to confirm the jury will see the right video without
                    leaving the dashboard. */}
                {submission.youtubeVideoId ? (
                  <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                    <iframe
                      src={youtubeEmbedUrl(submission.youtubeVideoId)}
                      title="Your submitted edit"
                      allow="accelerometer; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      className="absolute inset-0 size-full"
                    />
                  </div>
                ) : null}

                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                    <CheckCircle2 className="size-4" />
                    {submission.status === "LATE"
                      ? "Received — flagged late"
                      : "Received and locked"}
                  </p>
                  {submission.youtubeUrl ? (
                    <p className="mt-1.5 break-all font-mono text-xs text-emerald-100/80">
                      {submission.youtubeUrl}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-emerald-100/70">
                    Submitted {formatIST(submission.uploadedAt)} IST · the link cannot
                    be changed
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {(submission.youtubeUrl ?? submission.videoUrl) ? (
                    <Button asChild variant="secondary" size="sm">
                      <a
                        href={(submission.youtubeUrl ?? submission.videoUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink />
                        {submission.youtubeUrl ? "Open on YouTube" : "View on Drive"}
                      </a>
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {gates.uploadsOpen
                    ? "Submissions are open. Upload your edit to YouTube as Public or Unlisted, then paste the link — you get one submission and it cannot be changed afterwards."
                    : gates.deadlinePassed
                      ? "The submission window has closed."
                      : "The link form unlocks when the organisers open submissions on event day."}
                </p>
                {gates.uploadsOpen ? (
                  <YoutubeSubmitForm />
                ) : (
                  <Button disabled>
                    <Youtube />
                    Submissions not open yet
                  </Button>
                )}
              </>
            )}

            {submission?.status === "REJECTED" ? (
              <Alert variant="destructive">
                <AlertTriangle />
                <div>
                  <AlertTitle>Your submission was rejected</AlertTitle>
                  <AlertDescription>
                    {submission.rejectedReason ?? "Contact the organisers for details."}
                  </AlertDescription>
                </div>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What happens when</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3.5">
              {timeline.map((event) => {
                const done = event.occursAt.getTime() <= Date.now();
                return (
                  <li key={event.id} className="flex gap-3">
                    <span
                      className={`mt-1 size-2 shrink-0 rounded-full ${
                        done ? "bg-amber-400" : "bg-white/20"
                      }`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}
                      >
                        {event.title}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatIST(event.occursAt)} IST
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {[
              "Keep this dashboard open on event day. The task files, the ZIP password and the upload form all appear here — nothing arrives by email or DM.",
              "Download the ZIP as soon as it unlocks, then extract it with the password when it is announced.",
              "Edit to the brief inside the ZIP. Only you may work on your edit; anything else is disqualification.",
              `Export 1920×1080 H.264 as MP4 or MOV, under ${hackathon.maxUploadMb} MB, and upload through the portal.`,
              "Upload early. A file still transferring at the deadline counts as late.",
            ].map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-xs font-bold text-amber-200">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div>
        <p className="label-eyebrow">Results</p>
        <h2 className="heading-hero mt-2 text-xl sm:text-2xl">My scorecard</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Six criteria, each judge&apos;s overall mark, and their written feedback.
        </p>
      </div>
      <ScorecardPanel
        finalScore={contestant.finalScore}
        rank={contestant.rank}
        isWinner={contestant.isWinner}
        isRunnerUp={contestant.isRunnerUp}
        ratings={contestant.submission?.ratings ?? []}
        released={hackathon.resultsPublished}
        resultsAt={hackathon.resultsAt}
      />
    </div>
  );
}
