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
import { realignTimelineDates, scheduleFieldForTitle } from "../src/lib/timeline-sync";

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
  // Realignment now also happens whenever an admin saves /admin/settings; this
  // stays as the repair path for rows that drifted before that, or that were
  // edited directly in the database.
  const timeline = await prisma.timelineEvent.findMany({
    where: { hackathonId: hackathon.id },
    select: { id: true, title: true },
  });

  for (const row of timeline) {
    if (!scheduleFieldForTitle(row.title)) {
      console.log(`· timeline skip: "${row.title}" — no matching date on the edition`);
    }
  }

  const ist = (date: Date) =>
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);

  const realigned = await realignTimelineDates(prisma, hackathon, { dryRun });
  for (const change of realigned) {
    console.log(
      `· timeline update: "${change.title}" ${ist(change.from)} → ${ist(change.to)}`,
    );
  }

  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
