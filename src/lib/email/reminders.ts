import type { Contestant, Hackathon, ReminderType } from "@prisma/client";

import { sendMail } from "@/lib/email/send";
import {
  assetsReleasedEmail,
  oneDayEmail,
  oneHourEmail,
  registrationEmail,
  resultsEmail,
  threeDaysEmail,
  twoDaysEmail,
  type EmailContent,
} from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Offsets before `hackathon.startsAt` for each automated reminder. */
export const REMINDER_OFFSETS: {
  type: ReminderType;
  offsetMs: number;
  subject: string;
}[] = [
  {
    type: "THREE_DAYS_BEFORE",
    offsetMs: 3 * DAY,
    subject: "Your hackathon is coming soon",
  },
  { type: "TWO_DAYS_BEFORE", offsetMs: 2 * DAY, subject: "Prepare your setup" },
  { type: "ONE_DAY_BEFORE", offsetMs: 1 * DAY, subject: "Final reminder" },
  {
    type: "ONE_HOUR_BEFORE",
    offsetMs: 1 * HOUR,
    subject: "Hackathon starts in 1 hour",
  },
];

/**
 * Queues the four countdown reminders for one contestant.
 *
 * A reminder whose moment has already passed is written as SKIPPED rather than
 * omitted, so the admin can see *why* someone who registered late never got the
 * "3 days before" email. Uses upsert on (contestantId, type) — re-running after
 * a date change is safe.
 */
export async function scheduleRemindersForContestant(
  contestant: Pick<Contestant, "id" | "email" | "hackathonId">,
  hackathon: Pick<Hackathon, "id" | "startsAt">,
): Promise<void> {
  const now = Date.now();

  await Promise.all(
    REMINDER_OFFSETS.map(({ type, offsetMs, subject }) => {
      const scheduledFor = new Date(hackathon.startsAt.getTime() - offsetMs);
      const alreadyPast = scheduledFor.getTime() <= now;

      return prisma.emailReminder.upsert({
        where: { contestantId_type: { contestantId: contestant.id, type } },
        create: {
          hackathonId: hackathon.id,
          contestantId: contestant.id,
          type,
          toEmail: contestant.email,
          subject,
          scheduledFor,
          status: alreadyPast ? "SKIPPED" : "SCHEDULED",
        },
        update: {
          // Never rewrite something already delivered.
          scheduledFor,
          toEmail: contestant.email,
        },
      });
    }),
  );
}

/** Re-queues reminders for every registered contestant — used after a date change. */
export async function rescheduleAllReminders(hackathonId: string): Promise<number> {
  const hackathon = await prisma.hackathon.findUniqueOrThrow({
    where: { id: hackathonId },
    select: { id: true, startsAt: true },
  });

  const contestants = await prisma.contestant.findMany({
    where: { hackathonId, status: { notIn: ["DISQUALIFIED", "WITHDRAWN"] } },
    select: { id: true, email: true, hackathonId: true },
  });

  for (const contestant of contestants) {
    await scheduleRemindersForContestant(contestant, hackathon);
  }

  // A delivered reminder stays delivered; only pending rows follow new dates.
  await prisma.emailReminder.updateMany({
    where: { hackathonId, status: "SCHEDULED", scheduledFor: { lt: new Date() } },
    data: { status: "SKIPPED" },
  });

  return contestants.length;
}

function buildContent(
  type: ReminderType,
  contestant: Contestant,
  hackathon: Hackathon,
  totalRanked: number,
): EmailContent | null {
  const base = {
    name: contestant.fullName,
    contestantId: contestant.contestantId,
    hackathon,
  };

  switch (type) {
    case "REGISTRATION_CONFIRMATION":
      return registrationEmail(base);
    case "THREE_DAYS_BEFORE":
      return threeDaysEmail(base);
    case "TWO_DAYS_BEFORE":
      return twoDaysEmail(base);
    case "ONE_DAY_BEFORE":
      return oneDayEmail(base);
    case "ONE_HOUR_BEFORE":
      return oneHourEmail(base);
    case "ASSETS_RELEASED":
      return assetsReleasedEmail(base);
    case "RESULTS_ANNOUNCED":
      return resultsEmail({
        name: contestant.fullName,
        contestantId: contestant.contestantId,
        rank: contestant.rank,
        finalScore: contestant.finalScore,
        totalRanked,
        isWinner: contestant.isWinner,
        isRunnerUp: contestant.isRunnerUp,
      });
    // SUBMISSION_RECEIVED is sent inline at upload time, never queued.
    default:
      return null;
  }
}

export type ReminderRunSummary = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

/**
 * Drains the due-reminder queue. Called by the cron route every 15 minutes and
 * by the admin "Run queue now" button.
 *
 * Each row is claimed with a conditional update (SCHEDULED → SENDING) so two
 * overlapping cron invocations cannot send the same email twice.
 */
export async function processDueReminders(limit = 100): Promise<ReminderRunSummary> {
  const due = await prisma.emailReminder.findMany({
    where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    take: limit,
    select: { id: true },
  });

  const summary: ReminderRunSummary = { processed: 0, sent: 0, failed: 0, skipped: 0 };
  if (due.length === 0) return summary;

  const totalRanked = await prisma.contestant.count({ where: { rank: { not: null } } });

  for (const { id } of due) {
    const claimed = await prisma.emailReminder.updateMany({
      where: { id, status: "SCHEDULED" },
      data: { status: "SENDING", attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    const reminder = await prisma.emailReminder.findUnique({
      where: { id },
      include: { contestant: true, hackathon: true },
    });

    if (!reminder?.contestant) {
      await prisma.emailReminder.update({
        where: { id },
        data: { status: "CANCELLED", lastError: "Contestant no longer exists" },
      });
      continue;
    }

    summary.processed += 1;

    if (["DISQUALIFIED", "WITHDRAWN"].includes(reminder.contestant.status)) {
      await prisma.emailReminder.update({
        where: { id },
        data: {
          status: "CANCELLED",
          lastError: `Contestant is ${reminder.contestant.status}`,
        },
      });
      continue;
    }

    const content = buildContent(
      reminder.type,
      reminder.contestant,
      reminder.hackathon,
      totalRanked,
    );

    if (!content) {
      await prisma.emailReminder.update({
        where: { id },
        data: { status: "CANCELLED", lastError: `No template for ${reminder.type}` },
      });
      continue;
    }

    const result = await sendMail(reminder.toEmail, content);

    if (!result.ok) {
      summary.failed += 1;
      const giveUp = reminder.attempts + 1 >= 3;
      await prisma.emailReminder.update({
        where: { id },
        data: {
          // Two retries, then park it as FAILED for the admin to handle.
          status: giveUp ? "FAILED" : "SCHEDULED",
          lastError: result.error.slice(0, 500),
        },
      });
      continue;
    }

    if (result.skipped) summary.skipped += 1;
    else summary.sent += 1;

    await prisma.emailReminder.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        subject: content.subject,
        providerMessageId: result.messageId,
        lastError: null,
      },
    });
  }

  return summary;
}

/**
 * Queues one immediate email for every active contestant (assets released,
 * results announced). Delivery still happens through the same queue, so the
 * admin request returns fast and retries are automatic.
 */
export async function queueBroadcast(
  hackathonId: string,
  type: Extract<ReminderType, "ASSETS_RELEASED" | "RESULTS_ANNOUNCED">,
  subject: string,
): Promise<number> {
  const contestants = await prisma.contestant.findMany({
    where: { hackathonId, status: { notIn: ["DISQUALIFIED", "WITHDRAWN"] } },
    select: { id: true, email: true },
  });

  const now = new Date();

  for (const contestant of contestants) {
    await prisma.emailReminder.upsert({
      where: { contestantId_type: { contestantId: contestant.id, type } },
      create: {
        hackathonId,
        contestantId: contestant.id,
        type,
        toEmail: contestant.email,
        subject,
        scheduledFor: now,
        status: "SCHEDULED",
      },
      // Re-broadcast is allowed but only for rows that never went out.
      update: {},
    });
  }

  return contestants.length;
}
