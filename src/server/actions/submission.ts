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
 * Sets the entrant's YouTube link, and re-sets it on every later submit.
 *
 * The link is editable for exactly as long as the submission window is open:
 * an entrant who spots a private video, a 360p upload or a wrong paste fixes it
 * themselves instead of mailing the organisers. What closes the door is the
 * window, not the first submit — `uploadsOpen` is false once the deadline has
 * passed (unless late entries are accepted) and once judging begins, so no link
 * can move under a judge who is already scoring it.
 *
 * Enforced here rather than in the UI: a hidden form or a replayed request must
 * not be able to swap the link after the window shuts.
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
    select: { id: true, status: true, youtubeUrl: true, youtubeVideoId: true },
  });
  const hadLink = Boolean(
    existing && existing.status !== "NOT_SUBMITTED" && existing.youtubeVideoId,
  );

  if (!gates.uploadsOpen) {
    // An entrant with a link already in gets told what happens to it, rather
    // than the blunt "closed" a first-time submitter needs.
    return errorState(
      gates.deadlinePassed
        ? hadLink
          ? "The deadline has passed — the link you submitted is the one the jury watches."
          : "The submission deadline has passed."
        : "Submissions are not open yet.",
    );
  }

  const videoId = parseYoutubeId(parsed.data.youtubeUrl);
  if (!videoId) return errorState("That is not a YouTube video link.");

  // Re-submitting the same video is a no-op rather than a write: it must not
  // restamp `uploadedAt` or turn an on-time entry late.
  if (existing?.youtubeVideoId === videoId && hadLink) {
    return successState("That is already your submitted link — nothing changed.");
  }

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
    // The audit trail is the revision history: every link an entrant has had,
    // in order, without a column on the submission to keep it in.
    meta: {
      youtubeVideoId: videoId,
      isLate,
      replaced: hadLink,
      previousVideoId: existing?.youtubeVideoId ?? null,
    },
  });

  revalidatePath("/dashboard/submit");
  revalidatePath("/dashboard");

  if (isLate) {
    return successState("Submitted after the deadline — it is recorded as late.");
  }
  return successState(
    hadLink
      ? "Link updated. You can change it again until the deadline."
      : "Submitted. You can update the link until the deadline.",
  );
}
