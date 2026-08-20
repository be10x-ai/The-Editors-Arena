import {
  ArrowLeft,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Star,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/admin/action-button";
import { ReasonDialogButton } from "@/components/admin/reason-dialog-button";
import {
  ContestantStatusBadge,
  SubmissionStatusBadge,
} from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { avatarPublicUrl } from "@/lib/storage";
import { formatIST, formatScore } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/youtube";
import {
  disqualifyContestant,
  reinstateContestant,
  resendWelcomeEmail,
  toggleShortlist,
} from "@/server/actions/admin/contestants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Contestant" };

/** One field of the registration, as filed. */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="break-words text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

export default async function AdminContestantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;

  /**
   * Looked up by either key: the row id is what the table links with, the
   * contestant ID is what a human has in hand off an email or a video title.
   */
  const contestant = await prisma.contestant.findFirst({
    where: { OR: [{ id }, { contestantId: id.toUpperCase() }] },
    include: {
      submission: {
        include: {
          ratings: {
            where: { isSubmitted: true },
            include: { judge: { select: { name: true } } },
            orderBy: { submittedAt: "asc" },
          },
        },
      },
    },
  });
  if (!contestant) notFound();

  const photo = avatarPublicUrl(contestant.photoPath);
  const submission = contestant.submission;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/admin/contestants">
          <ArrowLeft />
          All registrations
        </Link>
      </Button>

      {/* Identity strip — the photo, who they are and what can be done to the
          entry, before any of the filed detail. */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              {photo ? (
                <Image
                  src={photo}
                  alt={`${contestant.fullName}'s profile photo`}
                  width={160}
                  height={160}
                  className="size-full object-cover"
                />
              ) : (
                <UserRound className="size-8 text-muted-foreground" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-xs tracking-wider text-sky-300">
                {contestant.contestantId}
              </p>
              <h1 className="heading-hero mt-1 text-2xl">{contestant.fullName}</h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <ContestantStatusBadge status={contestant.status} />
                {contestant.shortlisted ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                    <Star className="size-3" />
                    Shortlisted
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  Registered {formatIST(contestant.registeredAt)} IST
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <ActionButton
              action={resendWelcomeEmail}
              fields={{ contestantRowId: contestant.id }}
              size="sm"
              variant="secondary"
            >
              <Mail />
              Resend welcome
            </ActionButton>
            <ActionButton
              action={toggleShortlist}
              fields={{
                contestantRowId: contestant.id,
                shortlist: !contestant.shortlisted,
              }}
              size="sm"
              variant="secondary"
            >
              <Star className={contestant.shortlisted ? "text-sky-300" : undefined} />
              {contestant.shortlisted ? "Remove shortlist" : "Shortlist"}
            </ActionButton>
            {contestant.status === "DISQUALIFIED" ? (
              <ActionButton
                action={reinstateContestant}
                fields={{ contestantRowId: contestant.id }}
                size="sm"
                variant="secondary"
                confirm={{
                  title: `Reinstate ${contestant.contestantId}?`,
                  description:
                    "They return to the leaderboard and their submission counts again.",
                }}
              >
                Reinstate
              </ActionButton>
            ) : (
              <ReasonDialogButton
                action={disqualifyContestant}
                fields={{ contestantRowId: contestant.id }}
                title={`Disqualify ${contestant.contestantId}?`}
                description="They are removed from the leaderboard and pending emails are cancelled. The reason is shown on their dashboard."
                label="Disqualify"
                confirmLabel="Disqualify"
                size="sm"
                variant="ghost"
                className="text-rose-300 hover:bg-rose-500/10"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {contestant.status === "DISQUALIFIED" && contestant.disqualifiedReason ? (
        <Card className="border-rose-500/25 bg-rose-500/[0.06]">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-rose-200">Disqualified</p>
            <p className="mt-1 text-sm text-rose-100/80">
              {contestant.disqualifiedReason}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
            <CardDescription>Exactly as the entrant filed it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Email"
                value={
                  <a
                    href={`mailto:${contestant.email}`}
                    className="inline-flex items-center gap-1.5 text-sky-300 hover:underline"
                  >
                    <Mail className="size-3.5 shrink-0" />
                    {contestant.email}
                  </a>
                }
              />
              <Field
                label="Phone"
                value={
                  <a
                    href={`tel:+91${contestant.phone}`}
                    className="inline-flex items-center gap-1.5 text-sky-300 hover:underline"
                  >
                    <Phone className="size-3.5 shrink-0" />+91 {contestant.phone}
                  </a>
                }
              />
              <Field label="City" value={contestant.city} />
              <Field
                label="Experience"
                value={`${contestant.experienceYears} year${contestant.experienceYears === 1 ? "" : "s"}`}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Address"
                  value={
                    contestant.address ? (
                      <span className="inline-flex gap-2">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        {contestant.address}
                      </span>
                    ) : (
                      <span className="text-orange-300">
                        Not on file — registered before the address field existed.
                      </span>
                    )
                  }
                />
              </div>
              {contestant.jobRole ? (
                <Field label="Current role" value={contestant.jobRole} />
              ) : null}
              <Field label="Heard about us via" value={contestant.heardFrom} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Portfolio
              </p>
              <a
                href={contestant.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 break-all rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-medium text-sky-300 transition hover:border-sky-400/40 hover:bg-sky-500/[0.07]"
              >
                <ExternalLink className="size-4 shrink-0" />
                {contestant.portfolioUrl.replace(/^https?:\/\//, "")}
              </a>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Software
              </p>
              <div className="flex flex-wrap gap-2">
                {contestant.softwareSkills.length > 0 ? (
                  contestant.softwareSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-100"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">None listed.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Submission</CardTitle>
                <SubmissionStatusBadge
                  status={submission?.status ?? "NOT_SUBMITTED"}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission?.youtubeVideoId ? (
                <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                  <iframe
                    src={youtubeEmbedUrl(submission.youtubeVideoId)}
                    title={`${contestant.contestantId} submission`}
                    allow="accelerometer; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="absolute inset-0 size-full"
                  />
                </div>
              ) : null}

              {submission?.youtubeUrl ? (
                <>
                  <p className="break-all rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs">
                    {submission.youtubeUrl}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatIST(submission.uploadedAt)} IST
                    {submission.isLate ? " · flagged late" : ""}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing submitted yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Scoring</CardTitle>
                <span className="font-display text-xl font-semibold tabular-nums">
                  {formatScore(contestant.finalScore)}
                </span>
              </div>
              <CardDescription>
                {contestant.rank ? `Rank #${contestant.rank}` : "Not ranked yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submission?.ratings.length ? (
                <ul className="space-y-2.5">
                  {submission.ratings.map((rating) => (
                    <li
                      key={rating.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-muted-foreground">
                        {rating.judge.name}
                      </span>
                      <span className="font-display font-semibold tabular-nums">
                        {formatScore(rating.overallScore)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No submitted scorecards yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
