/**
 * Pushes the canonical landing-page content in `src/lib/defaults.ts` onto the
 * active edition — `npm run content:sync`.
 *
 * The seed deliberately never touches content that already exists, so a copy
 * change made in code (a restructured podium, a new FAQ) would otherwise stay
 * invisible on a database that has already been seeded. This is the one-way
 * door that lands it.
 *
 * Prizes are matched by `position`, FAQs by `question`. Rows the admin added
 * by hand are left alone; FAQ ordering of untouched rows is preserved. Pass
 * --dry to print the plan without writing.
 */
import { PrismaClient } from "@prisma/client";

import { DEFAULT_FAQS, DEFAULT_PRIZES } from "../src/lib/defaults";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry");
/**
 * Deleting a prize row is the one irreversible thing this script can do, and
 * "no longer in defaults" is a weak reason to lose data an admin may still be
 * using. Off unless asked for explicitly.
 */
const prune = process.argv.includes("--prune");

async function main() {
  const hackathon = await prisma.hackathon.findFirst({
    where: { isActive: true },
    orderBy: { edition: "desc" },
  });
  if (!hackathon) throw new Error("No active hackathon. Run `npm run db:seed` first.");

  console.log(`Edition: ${hackathon.name} (${hackathon.slug})`);
  if (dryRun) console.log("DRY RUN — nothing will be written.\n");

  // --- Prizes -------------------------------------------------------------
  const existingPrizes = await prisma.prize.findMany({
    where: { hackathonId: hackathon.id },
  });

  for (const prize of DEFAULT_PRIZES) {
    const current = existingPrizes.find((row) => row.position === prize.position);
    const verb = current ? "update" : "create";
    console.log(`· prize ${verb}: position ${prize.position} → ${prize.reward}`);
    if (dryRun) continue;

    if (current) {
      await prisma.prize.update({ where: { id: current.id }, data: prize });
    } else {
      await prisma.prize.create({ data: { ...prize, hackathonId: hackathon.id } });
    }
  }

  const keptPositions = new Set(DEFAULT_PRIZES.map((prize) => prize.position));
  const stale = existingPrizes.filter((row) => !keptPositions.has(row.position));
  for (const row of stale) {
    if (!prune) {
      console.log(
        `· prize kept: position ${row.position} (${row.reward}) — not in defaults, but the landing page already shows the podium only. Pass --prune to delete it.`,
      );
      continue;
    }
    console.log(`· prize delete: position ${row.position} (${row.reward}) — --prune`);
    if (!dryRun) await prisma.prize.delete({ where: { id: row.id } });
  }

  // --- FAQs ---------------------------------------------------------------
  const existingFaqs = await prisma.faq.findMany({ where: { hackathonId: hackathon.id } });

  for (const faq of DEFAULT_FAQS) {
    const current = existingFaqs.find((row) => row.question === faq.question);

    if (!current) {
      console.log(`· faq create: "${faq.question}"`);
      if (!dryRun) {
        await prisma.faq.create({ data: { ...faq, hackathonId: hackathon.id } });
      }
      continue;
    }

    if (current.answer === faq.answer) continue;
    console.log(`· faq update: "${faq.question}"`);
    if (!dryRun) {
      await prisma.faq.update({
        where: { id: current.id },
        data: { answer: faq.answer },
      });
    }
  }

  // --- Timeline dates -----------------------------------------------------
  // The hackathon row is the source of truth for every gate; the timeline rows
  // are display copy that has to agree with it. They drift the moment an admin
  // moves a date in /admin/settings, which edits the hackathon and leaves these
  // behind — so the public page ends up advertising a deadline the platform
  // will not enforce. Only dates are realigned: titles, descriptions, ordering
  // and which rows exist at all stay the admin's call.
  const TIMELINE_DATE_SOURCE: { match: RegExp; field: keyof typeof hackathon }[] = [
    { match: /registration\s*opens/i, field: "registrationOpensAt" },
    { match: /registration\s*closes/i, field: "registrationClosesAt" },
    { match: /(hackathon|event)\s*(begins|starts)/i, field: "startsAt" },
    { match: /task\s*released/i, field: "taskReleaseAt" },
    { match: /submission\s*deadline/i, field: "submissionDeadline" },
    { match: /^judging/i, field: "judgingEndsAt" },
    { match: /(winner|results)\s*announce/i, field: "resultsAt" },
  ];

  const timeline = await prisma.timelineEvent.findMany({
    where: { hackathonId: hackathon.id },
  });

  const ist = (date: Date) =>
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);

  for (const row of timeline) {
    const source = TIMELINE_DATE_SOURCE.find((entry) => entry.match.test(row.title));
    if (!source) {
      console.log(`· timeline skip: "${row.title}" — no matching date on the edition`);
      continue;
    }

    const correct = hackathon[source.field] as Date;
    if (row.occursAt.getTime() === correct.getTime()) continue;

    console.log(
      `· timeline update: "${row.title}" ${ist(row.occursAt)} → ${ist(correct)}`,
    );
    if (!dryRun) {
      await prisma.timelineEvent.update({
        where: { id: row.id },
        data: { occursAt: correct },
      });
    }
  }

  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
