import { NextResponse } from "next/server";

import { recordAudit } from "@/lib/audit";
import { integrationStatus } from "@/lib/env";
import {
  createResumableUploadSession,
  ensureContestantFolder,
  submissionFileName,
} from "@/lib/google/drive";
import { computeGates, requireActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { clientKey, hit, LIMITS } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/rbac";
import { uploadSessionSchema } from "@/lib/validations";

export const runtime = "nodejs";

/**
 * Step 1 of the upload: hand the browser a one-time Google Drive session URI.
 *
 * The video itself never passes through this server — see
 * `createResumableUploadSession` for why.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "CONTESTANT" || !user.contestantRowId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const limit = hit(
    clientKey(request.headers, `upload:${user.id}`),
    LIMITS.uploadSession.limit,
    LIMITS.uploadSession.window,
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many upload attempts. Wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid upload request." },
      { status: 400 },
    );
  }

  const hackathon = await requireActiveHackathon();
  const gates = computeGates(hackathon);

  // The submission window is checked before the integration state, so a closed
  // window always reports as closed rather than as a configuration problem.
  if (!gates.uploadsOpen) {
    return NextResponse.json(
      {
        error: gates.deadlinePassed
          ? "The submission deadline has passed."
          : "Uploads are not open yet.",
      },
      { status: 409 },
    );
  }

  if (!integrationStatus().drive) {
    return NextResponse.json(
      {
        error:
          "Google Drive is not configured on this deployment, so uploads are disabled. Contact the organisers.",
      },
      { status: 503 },
    );
  }

  const contestant = await prisma.contestant.findUnique({
    where: { id: user.contestantRowId },
    select: {
      id: true,
      contestantId: true,
      status: true,
      hackathonId: true,
      submission: { select: { id: true, status: true } },
    },
  });

  if (!contestant || contestant.hackathonId !== hackathon.id) {
    return NextResponse.json(
      { error: "Contestant record not found." },
      { status: 404 },
    );
  }
  if (contestant.status === "DISQUALIFIED" || contestant.status === "WITHDRAWN") {
    return NextResponse.json(
      { error: "Your entry is no longer active." },
      { status: 403 },
    );
  }

  const maxBytes = hackathon.maxUploadMb * 1024 * 1024;
  if (parsed.data.sizeBytes > maxBytes) {
    return NextResponse.json(
      {
        error: `That file is larger than the ${hackathon.maxUploadMb} MB limit set by the organisers.`,
      },
      { status: 413 },
    );
  }
  if (!hackathon.allowedMimeTypes.includes(parsed.data.mimeType)) {
    return NextResponse.json(
      { error: "Only MP4 and MOV files are accepted." },
      { status: 415 },
    );
  }

  try {
    const folderId = await ensureContestantFolder(
      contestant.contestantId,
      hackathon.submissionFolderId,
    );
    const fileName = submissionFileName(contestant.contestantId, parsed.data.fileName);

    const origin = new URL(request.url).origin;
    const uploadUrl = await createResumableUploadSession({
      folderId,
      fileName,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      origin,
    });

    await prisma.submission.update({
      where: { id: contestant.submission?.id ?? "" },
      data: { status: "UPLOADING", driveFolderId: folderId, fileName },
    });

    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "submission.upload_started",
      entity: "Submission",
      entityId: contestant.submission?.id,
      meta: { fileName, sizeBytes: parsed.data.sizeBytes },
    });

    return NextResponse.json({ uploadUrl, fileName, folderId });
  } catch (error) {
    console.error("[upload-session] failed", error);
    return NextResponse.json(
      { error: "Could not start the upload. Please try again in a moment." },
      { status: 502 },
    );
  }
}
