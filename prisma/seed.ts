/**
 * Seed script — `npm run db:seed`.
 *
 * Idempotent: safe to run repeatedly. It creates the 2026 edition, an admin,
 * five judges, and the landing-page content. Set SEED_DEMO_DATA=true to also
 * generate a realistic cohort with submissions, scorecards and ranks so every
 * screen can be reviewed before real registrations exist.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  DEFAULT_FAQS,
  DEFAULT_HACKATHON,
  DEFAULT_JUDGES,
  DEFAULT_PRIZES,
  DEFAULT_TIMELINE,
} from "../src/lib/defaults";

const prisma = new PrismaClient();

const CRITERIA = [
  "creativity",
  "storytelling",
  "editingSkill",
  "motionGraphics",
  "soundDesign",
  "technicalQuality",
] as const;

const WEIGHTS: Record<(typeof CRITERIA)[number], number> = {
  creativity: 0.2,
  storytelling: 0.2,
  editingSkill: 0.2,
  motionGraphics: 0.15,
  soundDesign: 0.15,
  technicalQuality: 0.1,
};

const env = (key: string, fallback: string) => process.env[key]?.trim() || fallback;
const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Deterministic pseudo-randomness, so re-seeding gives the same demo cohort. */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function main() {
  console.log("→ Seeding The Editor's Arena…\n");

  // --- Hackathon -----------------------------------------------------------
  const hackathon = await prisma.hackathon.upsert({
    where: { slug: DEFAULT_HACKATHON.slug },
    update: {},
    create: {
      slug: DEFAULT_HACKATHON.slug,
      name: DEFAULT_HACKATHON.name,
      tagline: DEFAULT_HACKATHON.tagline,
      edition: DEFAULT_HACKATHON.edition,
      idYear: DEFAULT_HACKATHON.idYear,
      idPrefix: DEFAULT_HACKATHON.idPrefix,
      timezone: DEFAULT_HACKATHON.timezone,
      registrationOpensAt: DEFAULT_HACKATHON.registrationOpensAt,
      registrationClosesAt: DEFAULT_HACKATHON.registrationClosesAt,
      startsAt: DEFAULT_HACKATHON.startsAt,
      taskReleaseAt: DEFAULT_HACKATHON.taskReleaseAt,
      submissionDeadline: DEFAULT_HACKATHON.submissionDeadline,
      judgingEndsAt: DEFAULT_HACKATHON.judgingEndsAt,
      resultsAt: DEFAULT_HACKATHON.resultsAt,
      assetZipName: DEFAULT_HACKATHON.assetZipName,
      maxUploadMb: DEFAULT_HACKATHON.maxUploadMb,
      judgesPerSubmission: DEFAULT_HACKATHON.judgesPerSubmission,
      status: "NOT_STARTED",
      isActive: true,
    },
  });
  console.log(`✓ Hackathon: ${hackathon.name} (${hackathon.slug})`);

  // --- Admin ---------------------------------------------------------------
  const adminEmail = env("SEED_ADMIN_EMAIL", "admin@editorarena.in").toLowerCase();
  const adminPassword = env("SEED_ADMIN_PASSWORD", "ChangeThisAdmin#2026");

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", isActive: true },
    create: {
      email: adminEmail,
      name: "Arena Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 12),
      emailVerified: new Date(),
    },
  });
  console.log(`✓ Admin: ${adminEmail}`);

  // --- Judges --------------------------------------------------------------
  const judgePassword = env("SEED_JUDGE_PASSWORD", "ChangeThisJudge#2026");
  const judgeHash = await bcrypt.hash(judgePassword, 12);
  const judgeIds: string[] = [];

  for (const judge of DEFAULT_JUDGES) {
    const email = judge.email.toLowerCase();
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: "JUDGE", name: judge.name, isActive: true },
      create: {
        email,
        name: judge.name,
        role: "JUDGE",
        passwordHash: judgeHash,
        emailVerified: new Date(),
      },
      select: { id: true },
    });

    const record = await prisma.judge.upsert({
      where: { email },
      update: {
        name: judge.name,
        title: judge.title,
        organization: judge.organization,
        expertise: judge.expertise,
        bio: judge.bio,
        isActive: true,
      },
      create: {
        userId: user.id,
        name: judge.name,
        email,
        title: judge.title,
        organization: judge.organization,
        expertise: judge.expertise,
        bio: judge.bio,
      },
      select: { id: true },
    });
    judgeIds.push(record.id);
  }
  console.log(`✓ Judges: ${judgeIds.length}`);

  // --- Landing-page content (only when empty, so admin edits survive) ------
  const [faqCount, prizeCount, timelineCount] = await Promise.all([
    prisma.faq.count({ where: { hackathonId: hackathon.id } }),
    prisma.prize.count({ where: { hackathonId: hackathon.id } }),
    prisma.timelineEvent.count({ where: { hackathonId: hackathon.id } }),
  ]);

  if (faqCount === 0) {
    await prisma.faq.createMany({
      data: DEFAULT_FAQS.map((faq) => ({ ...faq, hackathonId: hackathon.id })),
    });
    console.log(`✓ FAQs: ${DEFAULT_FAQS.length}`);
  } else {
    console.log(`· FAQs already present (${faqCount}) — left untouched`);
  }

  if (prizeCount === 0) {
    await prisma.prize.createMany({
      data: DEFAULT_PRIZES.map((prize) => ({ ...prize, hackathonId: hackathon.id })),
    });
    console.log(`✓ Prizes: ${DEFAULT_PRIZES.length}`);
  } else {
    console.log(`· Prizes already present (${prizeCount}) — left untouched`);
  }

  if (timelineCount === 0) {
    await prisma.timelineEvent.createMany({
      data: DEFAULT_TIMELINE.map((event) => ({ ...event, hackathonId: hackathon.id })),
    });
    console.log(`✓ Timeline entries: ${DEFAULT_TIMELINE.length}`);
  } else {
    console.log(`· Timeline already present (${timelineCount}) — left untouched`);
  }

  // --- Demo cohort ---------------------------------------------------------
  if (env("SEED_DEMO_DATA", "false") === "true") {
    await seedDemoCohort(hackathon.id, judgeIds);
  }

  console.log("\nDone.\n");
  console.log("Sign in at /login:");
  console.log(`  Admin  → ${adminEmail} / ${adminPassword}`);
  console.log(`  Judges → ${DEFAULT_JUDGES[0].email} / ${judgePassword}`);
  console.log("\nChange both passwords before going anywhere near production.\n");
}

const DEMO_PEOPLE = [
  ["Ananya Sharma", "Bengaluru", 4, "Freelance Editor"],
  ["Rohit Menon", "Kochi", 6, "Agency Editor"],
  ["Ishita Bose", "Kolkata", 2, "Student"],
  ["Vikram Nair", "Mumbai", 8, "In-house Editor"],
  ["Sneha Kulkarni", "Pune", 3, "Content Creator"],
  ["Aditya Rao", "Hyderabad", 5, "Freelance Editor"],
  ["Meera Iyer", "Chennai", 1, "Student"],
  ["Kabir Singh", "Delhi", 7, "Motion Designer"],
  ["Tanya Gupta", "Jaipur", 3, "Freelance Editor"],
  ["Arjun Pillai", "Thiruvananthapuram", 9, "In-house Editor"],
  ["Nikita Desai", "Ahmedabad", 2, "Between roles"],
  ["Farhan Khan", "Lucknow", 5, "Agency Editor"],
] as const;

const DEMO_COMMENTS = [
  "Strong moment selection and the first five seconds land. The mix drifts in the middle third — dialogue sits under the music where it should sit on top. Fix the levels and this is a shortlist edit.",
  "Clean, confident cutting with real rhythm. Graphics feel templated rather than designed; the lower thirds fight the frame. Story holds together, which is the hard part.",
  "Ambitious structure that mostly pays off. A few cuts land on the wrong beat and one transition glitches at 00:42. Sound design is the standout — genuinely thoughtful.",
  "Technically clean but creatively safe. Every choice is defensible and none is memorable. Would hire for volume work, not for the hero cut.",
  "Best storytelling in the batch. Takes a risk with the cold open and earns it. Export is soft — looks like a low-bitrate render rather than a grading choice.",
];

async function seedDemoCohort(hackathonId: string, judgeIds: string[]) {
  const existing = await prisma.contestant.count({ where: { hackathonId } });
  if (existing > 0) {
    console.log(`· Demo data skipped — ${existing} contestants already exist`);
    return;
  }

  const random = seededRandom(20260905);
  const now = new Date();

  console.log("\n→ Creating demo cohort…");

  for (const [index, person] of DEMO_PEOPLE.entries()) {
    const [fullName, city, experienceYears, jobRole] = person;
    const contestantId = `EA2026${String(index + 1).padStart(4, "0")}`;
    const email = `${fullName.split(" ")[0].toLowerCase()}.demo${index + 1}@example.com`;
    // The last two never upload, so the "not submitted" path has real data too.
    const submits = index < DEMO_PEOPLE.length - 2;

    const user = await prisma.user.create({
      data: { email, name: fullName, role: "CONTESTANT", emailVerified: now },
      select: { id: true },
    });

    const contestant = await prisma.contestant.create({
      data: {
        contestantId,
        userId: user.id,
        hackathonId,
        fullName,
        email,
        phone: `+9198${String(10000000 + index * 137).slice(0, 8)}`,
        city,
        experienceYears,
        jobRole,
        softwareSkills:
          experienceYears > 4
            ? ["Adobe Premiere Pro", "After Effects", "DaVinci Resolve"]
            : ["Adobe Premiere Pro", "CapCut"],
        portfolioUrl: `https://portfolio.example.com/${fullName.split(" ")[0].toLowerCase()}`,
        linkedinUrl: `https://linkedin.com/in/${fullName.toLowerCase().replace(/\s+/g, "-")}`,
        socialUrl:
          index % 3 === 0
            ? `https://youtube.com/@${fullName.split(" ")[0].toLowerCase()}`
            : null,
        heardFrom: ["Instagram", "LinkedIn", "YouTube", "WhatsApp / Friend"][index % 4],
        status: submits ? "SUBMITTED" : "ACTIVE",
        registeredAt: new Date(now.getTime() - (30 - index) * 86_400_000),
      },
      select: { id: true, contestantId: true },
    });

    const submission = await prisma.submission.create({
      data: {
        contestantId: contestant.id,
        hackathonId,
        status: submits ? (index === 9 ? "LATE" : "SUBMITTED") : "NOT_SUBMITTED",
        isLate: submits && index === 9,
        // Demo rows carry no real Drive ids; the player shows its empty state.
        fileName: submits ? `${contestantId}_Final_Video.mp4` : null,
        mimeType: submits ? "video/mp4" : null,
        sizeBytes: submits
          ? BigInt(Math.floor(180_000_000 + random() * 900_000_000))
          : null,
        uploadedAt: submits
          ? new Date(now.getTime() - (2 - index / 12) * 3_600_000)
          : null,
      },
      select: { id: true },
    });

    if (!submits) continue;

    // Rough skill signal: more experience trends higher, with judge variance.
    const base = 4.6 + Math.min(experienceYears, 9) * 0.35 + random() * 1.4;

    const overallScores: number[] = [];

    for (const [judgeIndex, judgeId] of judgeIds.entries()) {
      await prisma.judgeAssignment.create({
        data: { judgeId, submissionId: submission.id, completedAt: now },
      });

      const scores = {} as Record<(typeof CRITERIA)[number], number>;
      for (const criterion of CRITERIA) {
        const raw = base + (random() - 0.5) * 1.8;
        scores[criterion] = round1(Math.min(10, Math.max(0, raw)));
      }

      const computedScore = round2(
        CRITERIA.reduce((sum, key) => sum + scores[key] * WEIGHTS[key], 0),
      );
      const overallScore = round1(
        Math.min(10, Math.max(0, computedScore + (random() - 0.5) * 0.6)),
      );
      overallScores.push(overallScore);

      await prisma.rating.create({
        data: {
          submissionId: submission.id,
          judgeId,
          creativity: scores.creativity,
          storytelling: scores.storytelling,
          editingSkill: scores.editingSkill,
          motionGraphics: scores.motionGraphics,
          soundDesign: scores.soundDesign,
          technicalQuality: scores.technicalQuality,
          overallScore,
          computedScore,
          isSubmitted: true,
          submittedAt: now,
          feedback: {
            create: {
              comment: DEMO_COMMENTS[(index + judgeIndex) % DEMO_COMMENTS.length],
              strengths: overallScore > 7.5 ? "Pacing and moment selection" : null,
              weaknesses: overallScore < 6.5 ? "Audio mix and export settings" : null,
              recommendation:
                overallScore >= 8.5
                  ? "STRONG_HIRE"
                  : overallScore >= 7.5
                    ? "HIRE"
                    : overallScore >= 6.5
                      ? "FREELANCE_ROSTER"
                      : overallScore >= 5
                        ? "KEEP_WARM"
                        : "NO_HIRE",
            },
          },
        },
      });
    }

    const average = round2(
      overallScores.reduce((sum, score) => sum + score, 0) / overallScores.length,
    );

    await prisma.submission.update({
      where: { id: submission.id },
      data: { averageScore: average, ratingsCount: overallScores.length },
    });
    await prisma.contestant.update({
      where: { id: contestant.id },
      data: { finalScore: average },
    });
  }

  // --- Ranks (same competition-ranking rule as lib/scoring) ---------------
  const scored = await prisma.contestant.findMany({
    where: { hackathonId, finalScore: { not: null } },
    orderBy: { finalScore: "desc" },
    select: { id: true, finalScore: true },
  });

  let previousScore: number | null = null;
  let previousRank = 0;

  for (const [index, row] of scored.entries()) {
    const score = row.finalScore ?? 0;
    const rank =
      previousScore !== null && Math.abs(previousScore - score) < 1e-9
        ? previousRank
        : index + 1;
    previousScore = score;
    previousRank = rank;

    await prisma.contestant.update({
      where: { id: row.id },
      data: {
        rank,
        isWinner: rank === 1,
        isRunnerUp: rank > 1 && rank <= 4,
        shortlisted: rank <= 4,
        status: rank <= 4 ? "SHORTLISTED" : "SUBMITTED",
      },
    });
  }

  console.log(
    `✓ Demo cohort: ${DEMO_PEOPLE.length} contestants, ${scored.length} scored`,
  );
  console.log("  Move the event to JUDGING/COMPLETED in /admin to see the full flow.");
}

main()
  .catch((error) => {
    console.error("\n✗ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
