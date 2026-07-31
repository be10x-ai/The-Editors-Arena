import type { EventStatus, Hackathon } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";

import { prisma } from "@/lib/prisma";

/**
 * The active edition. Everything public reads through here, so a future
 * edition is a row change rather than a code change.
 */
export async function getActiveHackathon(): Promise<Hackathon | null> {
  noStore();
  return prisma.hackathon.findFirst({
    where: { isActive: true },
    orderBy: { edition: "desc" },
  });
}

export async function requireActiveHackathon(): Promise<Hackathon> {
  const hackathon = await getActiveHackathon();
  if (!hackathon) {
    throw new Error(
      "No active hackathon found. Run `npm run db:seed` or create one in /admin/settings.",
    );
  }
  return hackathon;
}

/**
 * Single source of truth for "what can this contestant see or do right now".
 *
 * Deliberately derived from event status + admin release flags rather than from
 * wall-clock time alone: the admin owns the transitions, so a delayed start
 * never leaks assets early or locks people out of a still-running event.
 */
export function computeGates(hackathon: Hackathon) {
  const now = Date.now();
  const status = hackathon.status;

  const registrationOpen =
    status === "NOT_STARTED" &&
    now >= hackathon.registrationOpensAt.getTime() &&
    now <= hackathon.registrationClosesAt.getTime();

  /**
   * Before the window opens. Distinct from `registrationClosed`: "not yet" and
   * "no longer" are opposite messages, and collapsing them into `!open` told
   * every visitor registration had closed during the run-up to launch.
   */
  const registrationNotYetOpen =
    status === "NOT_STARTED" && now < hackathon.registrationOpensAt.getTime();

  const eventLive =
    status === "RUNNING" || status === "SUBMISSION_OPEN" || status === "JUDGING";

  // Assets appear only once the event is live AND the admin has released them.
  const assetsVisible =
    hackathon.assetsReleased && (status === "RUNNING" || status === "SUBMISSION_OPEN");

  // The ZIP password is a second, independent switch: released manually on the day.
  const passwordVisible =
    assetsVisible && hackathon.passwordReleased && Boolean(hackathon.assetZipPassword);

  const deadlinePassed = now > hackathon.submissionDeadline.getTime();

  const uploadsOpen =
    status === "SUBMISSION_OPEN" && (!deadlinePassed || hackathon.allowLateSubmission);

  const judgingOpen = status === "JUDGING" && !hackathon.judgingLocked;

  const resultsVisible =
    hackathon.resultsPublished && (status === "COMPLETED" || status === "JUDGING");

  return {
    status,
    registrationOpen,
    registrationNotYetOpen,
    registrationOpensAt: hackathon.registrationOpensAt,
    registrationClosed:
      !registrationOpen && status === "NOT_STARTED"
        ? now > hackathon.registrationClosesAt.getTime()
        : status !== "NOT_STARTED",
    eventLive,
    hasStarted: status !== "NOT_STARTED",
    assetsVisible,
    passwordVisible,
    uploadsOpen,
    deadlinePassed,
    judgingOpen,
    judgingLocked: hackathon.judgingLocked,
    resultsVisible,
  };
}

export type Gates = ReturnType<typeof computeGates>;

/** Legal transitions. Prevents e.g. COMPLETED → RUNNING without an explicit reopen. */
export const STATUS_FLOW: Record<EventStatus, EventStatus[]> = {
  NOT_STARTED: ["RUNNING"],
  RUNNING: ["SUBMISSION_OPEN", "NOT_STARTED"],
  SUBMISSION_OPEN: ["JUDGING", "RUNNING"],
  JUDGING: ["COMPLETED", "SUBMISSION_OPEN"],
  COMPLETED: ["JUDGING"],
};

export function canTransition(from: EventStatus, to: EventStatus): boolean {
  return from === to || STATUS_FLOW[from].includes(to);
}

/** Public countdown target: the start, then the deadline, then results. */
export function countdownTarget(hackathon: Hackathon): {
  target: Date;
  label: string;
  reachedLabel: string;
} {
  switch (hackathon.status) {
    case "NOT_STARTED":
      return {
        target: hackathon.startsAt,
        label: "Hackathon begins in",
        reachedLabel: "Hackathon Started",
      };
    case "RUNNING":
    case "SUBMISSION_OPEN":
      return {
        target: hackathon.submissionDeadline,
        label: "Submission closes in",
        reachedLabel: "Submissions Closed",
      };
    case "JUDGING":
      return {
        target: hackathon.resultsAt,
        label: "Results announced in",
        reachedLabel: "Results Announced",
      };
    case "COMPLETED":
    default:
      return {
        target: hackathon.resultsAt,
        label: "Results announced",
        reachedLabel: "Results Announced",
      };
  }
}
