"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { registrationEmail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";
import { requireActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
import { persistRanking } from "@/lib/scoring";
import {
  errorState,
  successState,
  toMessage,
  type ActionState,
} from "@/server/actions/types";

/** Disqualifies an entry, removing it from the leaderboard immediately. */
export async function disqualifyContestant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const contestantRowId = String(formData.get("contestantRowId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!contestantRowId) return errorState("Missing contestant.");
  if (reason.length < 5) {
    return errorState("Give a reason — it goes on the record.", {
      reason: ["At least 5 characters"],
    });
  }

  const contestant = await prisma.contestant.update({
    where: { id: contestantRowId },
    data: {
      status: "DISQUALIFIED",
      disqualifiedReason: reason,
      rank: null,
      isWinner: false,
      isRunnerUp: false,
      shortlisted: false,
    },
    select: { id: true, contestantId: true, hackathonId: true },
  });

  // Pending reminders for a disqualified entrant would be a bad look.
  await prisma.emailReminder.updateMany({
    where: { contestantId: contestant.id, status: "SCHEDULED" },
    data: { status: "CANCELLED", lastError: "Contestant disqualified" },
  });

  await persistRanking(contestant.hackathonId);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "contestant.disqualified",
    entity: "Contestant",
    entityId: contestant.id,
    meta: { contestantId: contestant.contestantId, reason },
  });

  revalidatePath("/admin/contestants");
  revalidatePath("/leaderboard");
  return successState(`${contestant.contestantId} disqualified.`);
}

/** Puts a disqualified or withdrawn entry back in play. */
export async function reinstateContestant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const contestantRowId = String(formData.get("contestantRowId") ?? "");
  if (!contestantRowId) return errorState("Missing contestant.");

  const contestant = await prisma.contestant.findUnique({
    where: { id: contestantRowId },
    select: {
      id: true,
      contestantId: true,
      hackathonId: true,
      submission: { select: { status: true } },
    },
  });
  if (!contestant) return errorState("That contestant no longer exists.");

  const submitted = ["SUBMITTED", "LATE"].includes(
    contestant.submission?.status ?? "NOT_SUBMITTED",
  );

  await prisma.contestant.update({
    where: { id: contestant.id },
    data: {
      status: submitted ? "SUBMITTED" : "ACTIVE",
      disqualifiedReason: null,
    },
  });

  await persistRanking(contestant.hackathonId);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "contestant.reinstated",
    entity: "Contestant",
    entityId: contestant.id,
    meta: { contestantId: contestant.contestantId },
  });

  revalidatePath("/admin/contestants");
  revalidatePath("/leaderboard");
  return successState(`${contestant.contestantId} reinstated.`);
}

/** Flags a contestant for the hiring shortlist (independent of rank). */
export async function toggleShortlist(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const contestantRowId = String(formData.get("contestantRowId") ?? "");
  const shortlist = formData.get("shortlist") === "true";
  if (!contestantRowId) return errorState("Missing contestant.");

  const contestant = await prisma.contestant.update({
    where: { id: contestantRowId },
    data: {
      shortlisted: shortlist,
      ...(shortlist ? { status: "SHORTLISTED" } : {}),
    },
    select: { contestantId: true, id: true },
  });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: shortlist ? "contestant.shortlisted" : "contestant.unshortlisted",
    entity: "Contestant",
    entityId: contestant.id,
  });

  revalidatePath("/admin/contestants");
  return successState(
    shortlist
      ? `${contestant.contestantId} added to the hiring shortlist.`
      : `${contestant.contestantId} removed from the shortlist.`,
  );
}

/** Resends the welcome email, e.g. when someone lost their contestant ID. */
export async function resendWelcomeEmail(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const contestantRowId = String(formData.get("contestantRowId") ?? "");
  if (!contestantRowId) return errorState("Missing contestant.");

  const contestant = await prisma.contestant.findUnique({
    where: { id: contestantRowId },
    select: { id: true, fullName: true, email: true, contestantId: true },
  });
  if (!contestant) return errorState("That contestant no longer exists.");

  const hackathon = await requireActiveHackathon();
  const result = await sendMail(
    contestant.email,
    registrationEmail({
      name: contestant.fullName,
      contestantId: contestant.contestantId,
      hackathon,
    }),
  );

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "contestant.welcome_resent",
    entity: "Contestant",
    entityId: contestant.id,
    meta: { ok: result.ok },
  });

  if (!result.ok) return errorState(`Send failed: ${result.error}`);
  if (result.skipped) {
    return successState(
      `Email sending is disabled (${result.reason}) — logged instead.`,
    );
  }
  return successState(`Welcome email resent to ${contestant.email}.`);
}

/** Rejects a submission (wrong files, corrupt video, rule breach). */
export async function rejectSubmission(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const submissionId = String(formData.get("submissionId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!submissionId) return errorState("Missing submission.");
  if (reason.length < 5) {
    return errorState("Give a reason for the rejection.", {
      reason: ["At least 5 characters"],
    });
  }

  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "REJECTED", rejectedReason: reason, averageScore: null },
    select: {
      id: true,
      hackathonId: true,
      contestant: { select: { id: true, contestantId: true } },
    },
  });

  await persistRanking(submission.hackathonId);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "submission.rejected",
    entity: "Submission",
    entityId: submission.id,
    meta: { reason, contestantId: submission.contestant.contestantId },
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/leaderboard");
  return successState(`${submission.contestant.contestantId}'s submission rejected.`);
}

/** Restores a rejected submission. */
export async function restoreSubmission(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const submissionId = String(formData.get("submissionId") ?? "");
  if (!submissionId) return errorState("Missing submission.");

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      isLate: true,
      youtubeUrl: true,
      driveFileId: true,
      hackathonId: true,
    },
  });
  if (!submission) return errorState("That submission no longer exists.");
  // Entries are YouTube links now; driveFileId only ever fills on legacy rows,
  // so checking it alone made this reject every current submission.
  if (!submission.youtubeUrl && !submission.driveFileId) {
    return errorState("There is nothing submitted to restore.");
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status: submission.isLate ? "LATE" : "SUBMITTED",
      rejectedReason: null,
    },
  });

  await persistRanking(submission.hackathonId);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "submission.restored",
    entity: "Submission",
    entityId: submission.id,
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/leaderboard");
  return successState("Submission restored.");
}
