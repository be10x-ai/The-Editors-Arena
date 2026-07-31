"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { computeGates, requireActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/rbac";
import { youtubeSubmissionSchema } from "@/lib/validations";
import { parseYoutubeId, youtubeWatchUrl } from "@/lib/youtube";
import { errorState, successState, type ActionState } from "@/server/actions/types";

/**
 * Submits the entrant's YouTube link. Write-once by design.
 *
 * The lock is enforced here, not in the UI — a hidden form or a replayed request
 * must not be able to swap the link after the deadline. Only an admin can clear a
 * submission afterwards.
 */
export async function submitYoutubeLink(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || user.role !== "CONTESTANT" || !user.contestantRowId) {
    return errorState("Sign in as a contestant to submit.");
  }

  const parsed = youtubeSubmissionSchema.safeParse({
    youtubeUrl: formData.get("youtubeUrl"),
    confirmFinal:
      formData.get("confirmFinal") === "on" || formData.get("confirmFinal") === "true",
  });
  if (!parsed.success) {
    return errorState(
      "Check the link and confirmation.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
      { youtubeUrl: String(formData.get("youtubeUrl") ?? "") },
    );
  }

  const hackathon = await requireActiveHackathon();
  const gates = computeGates(hackathon);

  const existing = await prisma.submission.findUnique({
    where: { contestantId: user.contestantRowId },
    select: { id: true, status: true, youtubeUrl: true },
  });

  // The lock. Checked before the deadline gate so an already-submitted entrant
  // gets the accurate reason rather than "submissions are closed".
  if (
    existing &&
    existing.status !== "NOT_SUBMITTED" &&
    existing.status !== "REJECTED"
  ) {
    return errorState(
      "Your submission is already locked in. Contact the organisers if the link is wrong.",
    );
  }

  if (!gates.uploadsOpen) {
    return errorState(
      gates.deadlinePassed
        ? "The submission deadline has passed."
        : "Submissions are not open yet.",
    );
  }

  const videoId = parseYoutubeId(parsed.data.youtubeUrl);
  if (!videoId) return errorState("That is not a YouTube video link.");

  const now = new Date();
  const isLate = now.getTime() > hackathon.submissionDeadline.getTime();

  await prisma.submission.upsert({
    where: { contestantId: user.contestantRowId },
    create: {
      contestantId: user.contestantRowId,
      hackathonId: hackathon.id,
      status: isLate ? "LATE" : "SUBMITTED",
      youtubeUrl: youtubeWatchUrl(videoId),
      youtubeVideoId: videoId,
      uploadedAt: now,
      isLate,
    },
    update: {
      status: isLate ? "LATE" : "SUBMITTED",
      youtubeUrl: youtubeWatchUrl(videoId),
      youtubeVideoId: videoId,
      uploadedAt: now,
      isLate,
      rejectedReason: null,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "SUBMISSION_LINK_SET",
    entity: "Submission",
    entityId: user.contestantRowId,
    meta: { youtubeVideoId: videoId, isLate },
  });

  revalidatePath("/dashboard/submit");
  revalidatePath("/dashboard");

  return successState(
    isLate
      ? "Submitted after the deadline — it is recorded as late."
      : "Submitted. Your link is locked in.",
  );
}
