import type { Hackathon, PrismaClient } from "@prisma/client";

/**
 * Which schedule field on the edition each timeline row is a display copy of.
 *
 * The hackathon row is the source of truth for every gate; the timeline rows
 * are published copy that has to agree with it. They drift the moment a date
 * moves in /admin/settings — that edits the hackathon and leaves these behind,
 * so the landing page ends up advertising a deadline the platform will not
 * enforce. Matching is on the title, because that is the only stable handle a
 * row has; titles the admin invents simply do not match and are left alone.
 */
const TIMELINE_DATE_SOURCE: { match: RegExp; field: keyof Hackathon }[] = [
  { match: /registration\s*opens/i, field: "registrationOpensAt" },
  { match: /registration\s*closes/i, field: "registrationClosesAt" },
  { match: /(hackathon|event)\s*(begins|starts)/i, field: "startsAt" },
  { match: /task\s*(released|release)/i, field: "taskReleaseAt" },
  { match: /submission\s*deadline/i, field: "submissionDeadline" },
  { match: /^judging/i, field: "judgingEndsAt" },
  { match: /(winner|results)\s*announce/i, field: "resultsAt" },
];

export function scheduleFieldForTitle(title: string): keyof Hackathon | null {
  return TIMELINE_DATE_SOURCE.find((entry) => entry.match.test(title))?.field ?? null;
}

export type TimelineRealignment = {
  id: string;
  title: string;
  from: Date;
  to: Date;
};

/**
 * Moves every recognised timeline row onto the edition's current dates and
 * reports what changed. Only `occursAt` is touched: titles, descriptions,
 * ordering and which rows exist at all stay the admin's call.
 */
export async function realignTimelineDates(
  db: Pick<PrismaClient, "timelineEvent">,
  hackathon: Hackathon,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<TimelineRealignment[]> {
  const rows = await db.timelineEvent.findMany({
    where: { hackathonId: hackathon.id },
    select: { id: true, title: true, occursAt: true },
  });

  const changes: TimelineRealignment[] = [];

  for (const row of rows) {
    const field = scheduleFieldForTitle(row.title);
    if (!field) continue;

    const correct = hackathon[field] as Date;
    if (!(correct instanceof Date) || row.occursAt.getTime() === correct.getTime()) {
      continue;
    }

    changes.push({ id: row.id, title: row.title, from: row.occursAt, to: correct });
    if (!dryRun) {
      await db.timelineEvent.update({
        where: { id: row.id },
        data: { occursAt: correct },
      });
    }
  }

  return changes;
}
