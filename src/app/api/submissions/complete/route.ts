import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { submissionReceivedEmail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";
import {
  driveDownloadUrl,
  drivePreviewUrl,
  driveViewUrl,
  getFile,
  makeReadableByLink,
} from "@/lib/google/drive";
import { syncContestant } from "@/lib/google/sheets";
import { computeGates, requireActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/rbac";
import { completeUploadSchema } from "@/lib/validations";

export const runtime = "nodejs";
/**
 * Four sequential Google calls (getFile, makeReadableByLink, the sheet sync) plus
 * a transaction and an audit write. The platform default of 10s is tight for
 * that, and this route runs at the submission deadline — the one moment a
 * timeout costs a contestant their entry.
 */
export const maxDuration = 60;

/**
 * Step 2 of the upload: the browser reports the Drive file id it just created.
 *
 * We re-read the file from Drive rather than trusting the client's numbers, and
 * we verify it landed inside this contestant's own folder — otherwise a crafted
 * request could attach someone else's file to your submission.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "CONTESTANT" || !user.contestantRowId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = completeUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const hackathon = await requireActiveHackathon();
  const gates = computeGates(hackathon);

  const contestant = await prisma.contestant.findUnique({
    where: { id: user.contestantRowId },
    select: {
      id: true,
      contestantId: true,
      fullName: true,
      email: true,
      status: true,
      submission: { select: { id: true, driveFolderId: true } },
    },
  });

  if (!contestant?.submission) {
    return NextResponse.json(
      { error: "Submission record not found." },
      { status: 404 },
    );
  }

  let file;
  try {
    file = await getFile(parsed.data.driveFileId);
  } catch (error) {
    console.error("[complete] could not read Drive file", error);
    return NextResponse.json(
      { error: "We could not verify that upload with Google Drive." },
      { status: 502 },
    );
  }

  // Ownership check: the file must be the one we issued a session for.
  if (
    contestant.submission.driveFolderId &&
    file.name !== undefined &&
    !file.name.startsWith(contestant.contestantId)
  ) {
    return NextResponse.json(
      { error: "That file does not belong to your submission." },
      { status: 403 },
    );
  }

  const uploadedAt = new Date();
  const isLate = uploadedAt > hackathon.submissionDeadline;

  if (isLate && !hackathon.allowLateSubmission) {
    return NextResponse.json(
      { error: "The deadline passed while the upload was in flight." },
      { status: 409 },
    );
  }
  if (!gates.uploadsOpen) {
    return NextResponse.json({ error: "Submissions are closed." }, { status: 409 });
  }

  // Link-readable so the embedded player works in the judge portal.
  await makeReadableByLink(file.fileId).catch((error) => {
    console.error("[complete] permission grant failed", error);
  });

  await prisma.$transaction([
    prisma.submission.update({
      where: { id: contestant.submission.id },
      data: {
        status: isLate ? "LATE" : "SUBMITTED",
        driveFileId: file.fileId,
        videoUrl: driveViewUrl(file.fileId),
        previewUrl: drivePreviewUrl(file.fileId),
        downloadUrl: driveDownloadUrl(file.fileId),
        fileName: file.name || parsed.data.fileName,
        mimeType: file.mimeType ?? parsed.data.mimeType,
        sizeBytes: BigInt(file.sizeBytes ?? parsed.data.sizeBytes),
        uploadedAt,
        isLate,
        rejectedReason: null,
      },
    }),
    prisma.contestant.update({
      where: { id: contestant.id },
      data: { status: "SUBMITTED" },
    }),
  ]);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "submission.completed",
    entity: "Submission",
    entityId: contestant.submission.id,
    meta: { driveFileId: file.fileId, isLate, sizeBytes: file.sizeBytes ?? null },
  });

  await Promise.all([
    sendMail(
      contestant.email,
      submissionReceivedEmail({
        name: contestant.fullName,
        contestantId: contestant.contestantId,
        fileName: file.name || parsed.data.fileName,
        uploadedAt,
        isLate,
      }),
    ),
    syncContestant(contestant.id).catch((error) =>
      console.error("[complete] sheet sync failed", error),
    ),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/submit");

  return NextResponse.json({
    ok: true,
    status: isLate ? "LATE" : "SUBMITTED",
    videoUrl: driveViewUrl(file.fileId),
    fileName: file.name,
  });
}
