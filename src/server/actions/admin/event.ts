"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { processDueReminders, queueBroadcast } from "@/lib/email/reminders";
import { parseDriveFileId } from "@/lib/google/drive";
import { canTransition, requireActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
import { persistRanking } from "@/lib/scoring";
import { assetSettingsSchema, eventStatusSchema } from "@/lib/validations";
import {
  errorState,
  successState,
  toMessage,
  type ActionState,
} from "@/server/actions/types";

function revalidateEverything() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/submit");
  revalidatePath("/judge");
  revalidatePath("/leaderboard");
}

/** Moves the event between states, refusing transitions that skip the flow. */
export async function changeEventStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const parsed = eventStatusSchema.safeParse({
    status: formData.get("status"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return errorState("Pick a valid event status.");

  const hackathon = await requireActiveHackathon();
  const { status, note } = parsed.data;

  if (status === hackathon.status) {
    return successState(`Event is already ${status.replace(/_/g, " ").toLowerCase()}.`);
  }
  if (!canTransition(hackathon.status, status)) {
    return errorState(
      `You cannot go from ${hackathon.status} straight to ${status}. Move one step at a time.`,
    );
  }

  await prisma.$transaction([
    prisma.hackathon.update({
      where: { id: hackathon.id },
      data: { status },
    }),
    prisma.eventStatusLog.create({
      data: {
        hackathonId: hackathon.id,
        from: hackathon.status,
        to: status,
        changedById: user.id,
        note: note || null,
      },
    }),
  ]);

  // Everyone who registered becomes an active participant the moment we start.
  if (status === "RUNNING") {
    await prisma.contestant.updateMany({
      where: {
        hackathonId: hackathon.id,
        status: { in: ["REGISTERED", "CONFIRMED"] },
      },
      data: { status: "ACTIVE" },
    });
  }

  // Entering JUDGING freezes the field: recompute ranks from what exists.
  if (status === "JUDGING" || status === "COMPLETED") {
    await persistRanking(hackathon.id);
  }

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "event.status_changed",
    entity: "Hackathon",
    entityId: hackathon.id,
    meta: { from: hackathon.status, to: status, note: note ?? null },
  });

  revalidateEverything();
  return successState(
    `Event status is now ${status.replace(/_/g, " ").toLowerCase()}.`,
  );
}

/** Saves the task ZIP details. The password is stored but stays hidden until released. */
export async function saveAssetSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const parsed = assetSettingsSchema.safeParse({
    assetZipName: formData.get("assetZipName"),
    assetDriveUrl: formData.get("assetDriveUrl") ?? "",
    assetDriveFileId: formData.get("assetDriveFileId") ?? "",
    assetZipPassword: formData.get("assetZipPassword") ?? "",
  });

  if (!parsed.success) {
    return errorState(
      "Check the asset fields.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const hackathon = await requireActiveHackathon();
  const input = parsed.data;

  // Accept either a pasted Drive URL or a bare file id, and keep both in sync.
  const fileId =
    (input.assetDriveFileId && parseDriveFileId(input.assetDriveFileId)) ||
    (input.assetDriveUrl && parseDriveFileId(input.assetDriveUrl)) ||
    null;

  await prisma.hackathon.update({
    where: { id: hackathon.id },
    data: {
      assetZipName: input.assetZipName,
      assetDriveUrl:
        input.assetDriveUrl ||
        (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null),
      assetDriveFileId: fileId,
      // An empty password field means "leave as is", not "clear it".
      ...(input.assetZipPassword ? { assetZipPassword: input.assetZipPassword } : {}),
    },
  });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "assets.settings_saved",
    entity: "Hackathon",
    entityId: hackathon.id,
    meta: {
      assetZipName: input.assetZipName,
      hasPassword: Boolean(input.assetZipPassword),
    },
  });

  revalidateEverything();
  return successState("Asset settings saved.");
}

/** Reveals the download link to contestants (independent of the password). */
export async function toggleAssetRelease(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const release = formData.get("release") === "true";
  const hackathon = await requireActiveHackathon();

  if (release && !hackathon.assetDriveFileId && !hackathon.assetDriveUrl) {
    return errorState("Add the Drive link for the task ZIP before releasing it.");
  }
  if (release && hackathon.status === "NOT_STARTED") {
    return errorState("Start the event before releasing assets.");
  }

  await prisma.hackathon.update({
    where: { id: hackathon.id },
    data: {
      assetsReleased: release,
      assetsReleasedAt: release ? new Date() : null,
      // Pulling the assets back also hides the password.
      ...(release ? {} : { passwordReleased: false, passwordReleasedAt: null }),
    },
  });

  if (release) {
    await queueBroadcast(
      hackathon.id,
      "ASSETS_RELEASED",
      "Task files are live — download now",
    );
    // Send immediately rather than waiting for the next cron tick.
    await processDueReminders(200);
  }

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: release ? "assets.released" : "assets.hidden",
    entity: "Hackathon",
    entityId: hackathon.id,
  });

  revalidateEverything();
  return successState(
    release
      ? "Task files are now visible on every contestant dashboard."
      : "Task files hidden again.",
  );
}

/** Announces (or re-hides) the ZIP password. */
export async function togglePasswordRelease(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const release = formData.get("release") === "true";
  const hackathon = await requireActiveHackathon();

  if (release) {
    if (!hackathon.assetZipPassword) {
      return errorState("Set the ZIP password before announcing it.");
    }
    if (!hackathon.assetsReleased) {
      return errorState(
        "Release the task files first — the password is useless without them.",
      );
    }
  }

  await prisma.hackathon.update({
    where: { id: hackathon.id },
    data: {
      passwordReleased: release,
      passwordReleasedAt: release ? new Date() : null,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: release ? "assets.password_announced" : "assets.password_hidden",
    entity: "Hackathon",
    entityId: hackathon.id,
  });

  revalidateEverything();
  return successState(
    release ? "ZIP password is now on every contestant dashboard." : "Password hidden.",
  );
}

/** Freezes all scoring. Judges see their scorecards read-only afterwards. */
export async function toggleJudgingLock(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const lock = formData.get("lock") === "true";
  const hackathon = await requireActiveHackathon();

  await prisma.hackathon.update({
    where: { id: hackathon.id },
    data: { judgingLocked: lock },
  });

  if (lock) await persistRanking(hackathon.id);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: lock ? "judging.locked" : "judging.unlocked",
    entity: "Hackathon",
    entityId: hackathon.id,
  });

  revalidateEverything();
  return successState(
    lock ? "Judging locked and ranks recomputed." : "Judging reopened.",
  );
}

/** Publishes the leaderboard and emails every contestant their result. */
export async function publishResults(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const publish = formData.get("publish") === "true";
  const hackathon = await requireActiveHackathon();

  if (publish) {
    const ranked = await persistRanking(hackathon.id);
    if (ranked.length === 0) {
      return errorState(
        "Nothing to publish — no submission has a finalised score yet.",
      );
    }
  }

  await prisma.hackathon.update({
    where: { id: hackathon.id },
    data: { resultsPublished: publish },
  });

  let queued = 0;
  if (publish) {
    queued = await queueBroadcast(
      hackathon.id,
      "RESULTS_ANNOUNCED",
      "Your Editor's Arena results",
    );
    await processDueReminders(200);
  }

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: publish ? "results.published" : "results.unpublished",
    entity: "Hackathon",
    entityId: hackathon.id,
    meta: { queued },
  });

  revalidateEverything();
  return successState(
    publish
      ? `Results published. ${queued} result email${queued === 1 ? "" : "s"} queued.`
      : "Results hidden from the public leaderboard.",
  );
}

/** Recomputes every average and rank from finalised ratings. */
export async function recomputeRanking(): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const hackathon = await requireActiveHackathon();

  const submissions = await prisma.submission.findMany({
    where: { hackathonId: hackathon.id },
    select: { id: true },
  });

  for (const submission of submissions) {
    const ratings = await prisma.rating.findMany({
      where: { submissionId: submission.id, isSubmitted: true },
      select: { overallScore: true },
    });
    const average =
      ratings.length === 0
        ? null
        : Math.round(
            (ratings.reduce((sum, r) => sum + r.overallScore, 0) / ratings.length) *
              100,
          ) / 100;

    await prisma.submission.update({
      where: { id: submission.id },
      data: { averageScore: average, ratingsCount: ratings.length },
    });
  }

  const rows = await persistRanking(hackathon.id);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "ranking.recomputed",
    entity: "Hackathon",
    entityId: hackathon.id,
    meta: { ranked: rows.length },
  });

  revalidateEverything();
  return successState(
    `Recomputed ${rows.length} ranked submission${rows.length === 1 ? "" : "s"}.`,
  );
}
