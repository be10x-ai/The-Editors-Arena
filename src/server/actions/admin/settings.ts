"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { processDueReminders, rescheduleAllReminders } from "@/lib/email/reminders";
import { ensureSheet, syncAllContestants } from "@/lib/google/sheets";
import { requireActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
import { hackathonSettingsSchema } from "@/lib/validations";
import {
  errorState,
  successState,
  toMessage,
  type ActionState,
} from "@/server/actions/types";

/** Saves event dates and limits, then re-queues reminders against the new start. */
export async function saveHackathonSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const parsed = hackathonSettingsSchema.safeParse({
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    registrationOpensAt: formData.get("registrationOpensAt"),
    registrationClosesAt: formData.get("registrationClosesAt"),
    startsAt: formData.get("startsAt"),
    taskReleaseAt: formData.get("taskReleaseAt"),
    submissionDeadline: formData.get("submissionDeadline"),
    judgingEndsAt: formData.get("judgingEndsAt"),
    resultsAt: formData.get("resultsAt"),
    maxUploadMb: formData.get("maxUploadMb"),
    allowLateSubmission: formData.get("allowLateSubmission") === "on",
    judgesPerSubmission: formData.get("judgesPerSubmission"),
    sheetId: formData.get("sheetId") ?? "",
    sheetTabName: formData.get("sheetTabName") ?? "Registrations",
  });

  if (!parsed.success) {
    return errorState(
      "Check the settings — some values are invalid.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const input = parsed.data;

  // Chronology has to hold, or the countdown and gates contradict each other.
  const sequence: [string, Date][] = [
    ["Registration opens", input.registrationOpensAt],
    ["Registration closes", input.registrationClosesAt],
    ["Hackathon starts", input.startsAt],
    ["Submission deadline", input.submissionDeadline],
    ["Judging ends", input.judgingEndsAt],
    ["Results", input.resultsAt],
  ];
  for (let i = 1; i < sequence.length; i += 1) {
    if (sequence[i][1] <= sequence[i - 1][1]) {
      return errorState(`${sequence[i][0]} must come after ${sequence[i - 1][0]}.`);
    }
  }
  if (input.taskReleaseAt < input.startsAt) {
    return errorState("Task release cannot be earlier than the start time.");
  }

  const hackathon = await requireActiveHackathon();
  const startChanged = hackathon.startsAt.getTime() !== input.startsAt.getTime();

  await prisma.hackathon.update({
    where: { id: hackathon.id },
    data: {
      name: input.name,
      tagline: input.tagline,
      registrationOpensAt: input.registrationOpensAt,
      registrationClosesAt: input.registrationClosesAt,
      startsAt: input.startsAt,
      taskReleaseAt: input.taskReleaseAt,
      submissionDeadline: input.submissionDeadline,
      judgingEndsAt: input.judgingEndsAt,
      resultsAt: input.resultsAt,
      maxUploadMb: input.maxUploadMb,
      allowLateSubmission: input.allowLateSubmission,
      judgesPerSubmission: input.judgesPerSubmission,
      sheetId: input.sheetId || null,
      sheetTabName: input.sheetTabName,
    },
  });

  let rescheduled = 0;
  if (startChanged) {
    rescheduled = await rescheduleAllReminders(hackathon.id).catch((error) => {
      console.error("[settings] reschedule failed", error);
      return 0;
    });
  }

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "hackathon.settings_saved",
    entity: "Hackathon",
    entityId: hackathon.id,
    meta: { startChanged, rescheduled },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");

  return successState(
    startChanged
      ? `Settings saved. Reminders re-queued for ${rescheduled} contestant${rescheduled === 1 ? "" : "s"}.`
      : "Settings saved.",
  );
}

/** Pushes every contestant row into Google Sheets. */
export async function resyncSheet(): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const hackathon = await requireActiveHackathon();

  try {
    await ensureSheet(hackathon.id);
    const count = await syncAllContestants(hackathon.id);

    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "sheet.resynced",
      entity: "Hackathon",
      entityId: hackathon.id,
      meta: { rows: count },
    });

    revalidatePath("/admin/settings");
    return successState(
      count === 0
        ? "Sheet is configured but there are no contestants to sync yet."
        : `Synced ${count} row${count === 1 ? "" : "s"} to Google Sheets.`,
    );
  } catch (error) {
    console.error("[settings] sheet resync failed", error);
    return errorState(
      toMessage(
        error,
        "Could not reach Google Sheets. Check the service-account access.",
      ),
    );
  }
}

/** Drains the reminder queue on demand instead of waiting for the cron. */
export async function runReminderQueue(): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const summary = await processDueReminders(200);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "reminders.queue_run",
    entity: "EmailReminder",
    meta: summary,
  });

  revalidatePath("/admin/emails");

  if (summary.processed === 0) return successState("Nothing due in the queue.");
  return successState(
    `Processed ${summary.processed}: ${summary.sent} sent, ${summary.skipped} skipped, ${summary.failed} failed.`,
  );
}

/** Re-queues a failed or cancelled reminder for the next queue run. */
export async function retryReminder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const id = String(formData.get("reminderId") ?? "");
  if (!id) return errorState("Missing reminder.");

  const reminder = await prisma.emailReminder.findUnique({ where: { id } });
  if (!reminder) return errorState("That reminder no longer exists.");

  await prisma.emailReminder.update({
    where: { id },
    data: {
      status: "SCHEDULED",
      scheduledFor: new Date(),
      attempts: 0,
      lastError: null,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "reminder.retried",
    entity: "EmailReminder",
    entityId: id,
    meta: { type: reminder.type },
  });

  revalidatePath("/admin/emails");
  return successState("Re-queued. It will go out on the next queue run.");
}
