import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SubmissionPlayer } from "@/components/shared/submission-player";
import { RatingForm } from "@/components/judge/rating-form";
import { SubmissionStatusBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeGates, getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatBytes, formatIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Review submission" };

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const user = await requireRole("JUDGE", "ADMIN");
  if (!user.judgeId) redirect("/judge");

  const hackathon = await getActiveHackathon();
  const gates = hackathon ? computeGates(hackathon) : null;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      contestant: {
        select: {
          contestantId: true,
          fullName: true,
          city: true,
          experienceYears: true,
          jobRole: true,
          softwareSkills: true,
          portfolioUrl: true,
          linkedinUrl: true,
          socialUrl: true,
          status: true,
        },
      },
      assignments: { where: { judgeId: user.judgeId }, select: { id: true } },
      ratings: {
        where: { judgeId: user.judgeId },
        include: { feedback: true },
      },
    },
  });

  if (!submission) notFound();

  // Judges only ever see submissions assigned to them. Admins can audit any.
  if (submission.assignments.length === 0 && user.role !== "ADMIN") {
    redirect("/judge");
  }

  const rating = submission.ratings[0];
  const readOnly = Boolean(rating?.isSubmitted);
  const locked = Boolean(hackathon?.judgingLocked) || !gates?.judgingOpen;

  const links = [
    { label: "Portfolio", href: submission.contestant.portfolioUrl },
    { label: "LinkedIn", href: submission.contestant.linkedinUrl },
    { label: "Instagram / YouTube", href: submission.contestant.socialUrl },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/judge">
          <ArrowLeft />
          Back to my queue
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold tracking-wider text-sky-300">
            {submission.contestant.contestantId}
          </p>
          <h1 className="heading-hero mt-1.5 text-2xl sm:text-3xl">
            {submission.contestant.fullName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SubmissionStatusBadge status={submission.status} />
            {submission.isLate ? <Badge variant="warning">Late upload</Badge> : null}
            {readOnly ? <Badge variant="success">You scored this</Badge> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <SubmissionPlayer
            youtubeVideoId={submission.youtubeVideoId}
            youtubeUrl={submission.youtubeUrl}
            previewUrl={submission.previewUrl}
            viewUrl={submission.videoUrl}
            title={`Submission ${submission.contestant.contestantId}`}
          />

          <Card>
            <CardHeader>
              <CardTitle>Contestant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  [
                    "Experience",
                    `${submission.contestant.experienceYears} year${submission.contestant.experienceYears === 1 ? "" : "s"}`,
                  ],
                  ["Current role", submission.contestant.jobRole],
                  ["City", submission.contestant.city],
                  ["Uploaded", `${formatIST(submission.uploadedAt)} IST`],
                  ["File", submission.fileName ?? "—"],
                  ["Size", formatBytes(submission.sizeBytes)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 truncate text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <p className="label-eyebrow mb-2">Software</p>
                <div className="flex flex-wrap gap-2">
                  {submission.contestant.softwareSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="label-eyebrow mb-2">Previous work</p>
                <ul className="flex flex-wrap gap-4">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {link.label}
                        <ExternalLink className="size-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <RatingForm
            submissionId={submission.id}
            locked={locked}
            readOnly={readOnly}
            initial={
              rating
                ? {
                    creativity: rating.creativity,
                    storytelling: rating.storytelling,
                    editingSkill: rating.editingSkill,
                    motionGraphics: rating.motionGraphics,
                    soundDesign: rating.soundDesign,
                    technicalQuality: rating.technicalQuality,
                    overallScore: rating.overallScore,
                    comment: rating.feedback?.comment ?? "",
                    strengths: rating.feedback?.strengths ?? "",
                    weaknesses: rating.feedback?.weaknesses ?? "",
                    recommendation: rating.feedback?.recommendation ?? "KEEP_WARM",
                  }
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}
