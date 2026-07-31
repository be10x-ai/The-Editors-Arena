import { CheckCircle2, Clock, ExternalLink, Info, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { VideoUploader } from "@/components/dashboard/video-uploader";
import { SubmissionStatusBadge } from "@/components/shared/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { integrationStatus } from "@/lib/env";
import { computeGates, getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatBytes, formatIST } from "@/lib/utils";

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
  const hasSubmitted =
    submission?.status === "SUBMITTED" || submission?.status === "LATE";
  const driveReady = integrationStatus().drive;

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Submission</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">
          Upload your final video
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Your file uploads straight to our Google Drive into a folder named after your
          contestant ID. Judges watch it inside the portal — no downloads, no public
          links.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>
                {hasSubmitted ? "Replace your submission" : "Upload"}
              </CardTitle>
              {submission ? <SubmissionStatusBadge status={submission.status} /> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {hasSubmitted && submission ? (
              <Alert variant="success">
                <CheckCircle2 />
                <div>
                  <AlertTitle>
                    {submission.status === "LATE"
                      ? "Received — flagged late"
                      : "Already received"}
                  </AlertTitle>
                  <AlertDescription>
                    <span className="block font-mono text-xs">
                      {submission.fileName}
                    </span>
                    {formatBytes(submission.sizeBytes)} · uploaded{" "}
                    {formatIST(submission.uploadedAt)} IST.
                    {gates.uploadsOpen
                      ? " Uploading again replaces it."
                      : " The window is now closed."}
                  </AlertDescription>
                </div>
              </Alert>
            ) : null}

            {!gates.uploadsOpen ? (
              <Alert variant={gates.deadlinePassed ? "destructive" : "warning"}>
                {gates.deadlinePassed ? <Clock /> : <Lock />}
                <div>
                  <AlertTitle>
                    {gates.deadlinePassed
                      ? "The deadline has passed"
                      : "Uploads aren't open yet"}
                  </AlertTitle>
                  <AlertDescription>
                    {gates.deadlinePassed
                      ? `Submissions closed at ${formatIST(hackathon.submissionDeadline)} IST.`
                      : `The organisers open uploads on event day. Deadline: ${formatIST(hackathon.submissionDeadline)} IST.`}
                  </AlertDescription>
                </div>
              </Alert>
            ) : !driveReady ? (
              <Alert variant="destructive">
                <Info />
                <div>
                  <AlertTitle>Uploads are temporarily unavailable</AlertTitle>
                  <AlertDescription>
                    Google Drive isn&apos;t configured on this deployment yet. Contact
                    the organisers — do not wait until the deadline.
                  </AlertDescription>
                </div>
              </Alert>
            ) : (
              <VideoUploader
                maxUploadMb={hackathon.maxUploadMb}
                hasExistingSubmission={hasSubmitted}
              />
            )}

            {submission?.videoUrl ? (
              <Button asChild variant="secondary" size="sm">
                <a href={submission.videoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  View my uploaded video
                </a>
              </Button>
            ) : null}
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
                  ["Formats", "MP4 or MOV"],
                  ["Maximum size", `${hackathon.maxUploadMb} MB`],
                  ["Recommended export", "1920×1080, H.264"],
                  ["Deadline", `${formatIST(hackathon.submissionDeadline)} IST`],
                  [
                    "Late uploads",
                    hackathon.allowLateSubmission
                      ? "Accepted but flagged"
                      : "Not accepted",
                  ],
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
              <CardTitle>Before you upload</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                <li>
                  • Watch your export end to end once. Silent audio and black frames are
                  the two most common failures.
                </li>
                <li>
                  • Rename nothing — we rename the file to your contestant ID
                  automatically.
                </li>
                <li>
                  • Upload with time to spare. The deadline is when the transfer
                  completes.
                </li>
                <li>• Keep the tab open until you see the confirmation.</li>
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
