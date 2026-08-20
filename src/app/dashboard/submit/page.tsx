import { CheckCircle2, Clock, ExternalLink, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { YoutubeSubmitForm } from "@/components/dashboard/youtube-submit-form";
import { SubmissionStatusBadge } from "@/components/shared/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeGates, getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Submit your video" };

export default async function SubmitPage() {
  const user = await requireRole("CONTESTANT");
  const hackathon = await getActiveHackathon();
  if (!hackathon) redirect("/dashboard");

  const contestant = await prisma.contestant.findUnique({
    where: { id: user.contestantRowId ?? "" },
    include: { submission: true },
  });
  if (!contestant) redirect("/dashboard");

  const gates = computeGates(hackathon);
  const submission = contestant.submission;
  const hasLink = submission?.status === "SUBMITTED" || submission?.status === "LATE";
  // The link stays the entrant's to change for as long as the window is open;
  // it is the deadline that closes it, not the act of submitting.
  const canEdit = gates.uploadsOpen;
  // Shown verbatim so entrants copy it rather than inventing a format — the
  // title is how the jury ties an unlisted video back to a contestant.
  const requiredTitle = `${contestant.contestantId} - ${contestant.fullName}`;

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Submission</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Submit your edit</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Upload your finished edit to YouTube in 1080p, title it{" "}
          <strong className="text-foreground">{requiredTitle}</strong>, then paste the
          link here. You can replace the link as often as you need until{" "}
          <strong className="text-foreground">
            {formatIST(hackathon.submissionDeadline)} IST
          </strong>{" "}
          — whatever is in at that moment is what the jury watches.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{hasLink ? "Your submission" : "Paste your link"}</CardTitle>
              {submission ? <SubmissionStatusBadge status={submission.status} /> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {hasLink && submission ? (
              <>
                <Alert variant="success">
                  <CheckCircle2 />
                  <div>
                    <AlertTitle>
                      {submission.status === "LATE"
                        ? "Received — flagged late"
                        : canEdit
                          ? "Received"
                          : "Received and locked"}
                    </AlertTitle>
                    <AlertDescription>
                      Submitted {formatIST(submission.uploadedAt)} IST.{" "}
                      {canEdit
                        ? `You can replace it below until ${formatIST(hackathon.submissionDeadline)} IST — the last link saved is the one the jury watches.`
                        : "The window is closed. The jury watches this link — contact the organisers if it is wrong."}
                    </AlertDescription>
                  </div>
                </Alert>

                {submission.youtubeUrl ? (
                  <div className="space-y-3">
                    <p className="label-eyebrow">Submitted link</p>
                    <p className="break-all rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs">
                      {submission.youtubeUrl}
                    </p>
                    <Button asChild variant="secondary" size="sm">
                      <a
                        href={submission.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink />
                        Open on YouTube
                      </a>
                    </Button>
                  </div>
                ) : null}

                {canEdit ? (
                  <div className="space-y-4 border-t border-white/[0.07] pt-5">
                    <div>
                      <p className="label-eyebrow">Changed your mind?</p>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        Paste a different link and save. It replaces the one above
                        immediately — there is no need to ask the organisers.
                      </p>
                    </div>
                    <YoutubeSubmitForm currentUrl={submission.youtubeUrl} replacing />
                  </div>
                ) : null}
              </>
            ) : !gates.uploadsOpen ? (
              <Alert variant={gates.deadlinePassed ? "destructive" : "warning"}>
                {gates.deadlinePassed ? <Clock /> : <Lock />}
                <div>
                  <AlertTitle>
                    {gates.deadlinePassed
                      ? "The deadline has passed"
                      : "Submissions aren't open yet"}
                  </AlertTitle>
                  <AlertDescription>
                    {gates.deadlinePassed
                      ? `Submissions closed at ${formatIST(hackathon.submissionDeadline)} IST.`
                      : `The organisers open submissions on event day. Deadline: ${formatIST(hackathon.submissionDeadline)} IST.`}
                  </AlertDescription>
                </div>
              </Alert>
            ) : (
              <>
                {submission?.status === "REJECTED" && submission.rejectedReason ? (
                  <Alert variant="warning">
                    <Clock />
                    <div>
                      <AlertTitle>Your previous link was rejected</AlertTitle>
                      <AlertDescription>{submission.rejectedReason}</AlertDescription>
                    </div>
                  </Alert>
                ) : null}
                <YoutubeSubmitForm />
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {[
                  ["Where", "YouTube — a link, not a file"],
                  ["Resolution", "1080p (1920×1080), H.264"],
                  ["Visibility", "Public or Unlisted"],
                  ["Video title", requiredTitle],
                  ["Deadline", `${formatIST(hackathon.submissionDeadline)} IST`],
                  [
                    "Late submissions",
                    hackathon.allowLateSubmission
                      ? "Accepted but flagged"
                      : "Not accepted",
                  ],
                  ["Changes after submit", "Until the deadline"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Before you submit</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                <li>
                  • Title the video exactly{" "}
                  <strong className="break-all font-mono text-foreground">
                    {requiredTitle}
                  </strong>
                  . An untitled or mismatched video is slower to verify and may be
                  queried before it is scored.
                </li>
                <li>
                  • Export and upload at{" "}
                  <strong className="text-foreground">1080p</strong>. YouTube will offer
                  lower resolutions too, but the judges watch the best available and
                  anything under 1080p reads as a technical fault.
                </li>
                <li>
                  • Set the video to{" "}
                  <strong className="text-foreground">Unlisted</strong> if you would
                  rather it not appear on your channel. Private will not play for the
                  jury and scores zero.
                </li>
                <li>
                  • Wait for YouTube to finish processing HD. A link submitted while it
                  is still at 360p is what the judges will see.
                </li>
                <li>
                  • Watch it end to end on YouTube once. Silent audio and black frames
                  are the two most common failures.
                </li>
                <li>
                  • Open the link in a private window to confirm it plays for someone
                  who is not signed in as you.
                </li>
                <li>
                  • You can replace the link until the deadline — but the clock does
                  not stop for a re-upload, so paste carefully the first time.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/dashboard">Back to overview</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
