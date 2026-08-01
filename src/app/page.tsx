import type { Faq, Hackathon, Prize, TimelineEvent } from "@prisma/client";

import { AboutSection } from "@/components/landing/about-section";
import { CtaSection } from "@/components/landing/cta-section";
import { FaqSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { PrizeSection } from "@/components/landing/prize-section";
import { TimelineSection } from "@/components/landing/timeline-section";
import {
  DEFAULT_FAQS,
  DEFAULT_HACKATHON,
  DEFAULT_PRIZES,
  DEFAULT_TIMELINE,
} from "@/lib/defaults";
import { computeGates, countdownTarget } from "@/lib/hackathon";
import { formatISTDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getSessionUser, homeFor } from "@/lib/rbac";

// Live event state, live registration count — never statically cached.
export const dynamic = "force-dynamic";

type LandingData = {
  hackathon: Hackathon;
  faqs: Faq[];
  prizes: Prize[];
  timeline: TimelineEvent[];
  registrationsCount: number;
  usingFallback: boolean;
};

/**
 * Placeholder edition used when the database is unreachable (fresh clone, no
 * migration yet, transient outage). The marketing page is the one surface that
 * must never 500, so it degrades to seed content instead.
 */
function fallbackData(): LandingData {
  const now = new Date();
  const hackathon = {
    ...DEFAULT_HACKATHON,
    id: "fallback",
    status: "NOT_STARTED",
    isActive: true,
    assetDriveFileId: null,
    assetDriveUrl: null,
    assetZipPassword: null,
    assetsReleased: false,
    passwordReleased: false,
    assetsReleasedAt: null,
    passwordReleasedAt: null,
    submissionFolderId: null,
    allowedMimeTypes: ["video/mp4", "video/quicktime"],
    allowLateSubmission: false,
    judgingLocked: false,
    resultsPublished: false,
    sheetId: null,
    sheetTabName: "Registrations",
    createdAt: now,
    updatedAt: now,
  } as unknown as Hackathon;

  return {
    hackathon,
    faqs: DEFAULT_FAQS.map((faq, index) => ({
      ...faq,
      id: `fallback-faq-${index}`,
      hackathonId: "fallback",
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    })),
    prizes: DEFAULT_PRIZES.map((prize, index) => ({
      ...prize,
      id: `fallback-prize-${index}`,
      hackathonId: "fallback",
      createdAt: now,
      updatedAt: now,
    })),
    timeline: DEFAULT_TIMELINE.map((event, index) => ({
      ...event,
      id: `fallback-timeline-${index}`,
      hackathonId: "fallback",
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    })),
    registrationsCount: 0,
    usingFallback: true,
  };
}

async function getLandingData(): Promise<LandingData> {
  try {
    const hackathon = await prisma.hackathon.findFirst({
      where: { isActive: true },
      orderBy: { edition: "desc" },
    });
    if (!hackathon) return fallbackData();

    const [faqs, prizes, timeline, registrationsCount] = await Promise.all([
      prisma.faq.findMany({
        where: { hackathonId: hackathon.id, isPublished: true },
        orderBy: { order: "asc" },
      }),
      prisma.prize.findMany({
        where: { hackathonId: hackathon.id },
        orderBy: { order: "asc" },
      }),
      prisma.timelineEvent.findMany({
        where: { hackathonId: hackathon.id, isPublished: true },
        orderBy: { order: "asc" },
      }),
      prisma.contestant.count({ where: { hackathonId: hackathon.id } }),
    ]);

    return {
      hackathon,
      faqs,
      prizes,
      timeline,
      registrationsCount,
      usingFallback: false,
    };
  } catch (error) {
    console.error("[landing] falling back to seed content:", error);
    return fallbackData();
  }
}

export default async function LandingPage() {
  const [data, sessionUser] = await Promise.all([getLandingData(), getSessionUser()]);
  const { hackathon } = data;

  const gates = computeGates(hackathon);
  const countdown = countdownTarget(hackathon);
  const topPrize = data.prizes.find((prize) => prize.position === 1);

  return (
    <>
      <Navbar
        isAuthenticated={Boolean(sessionUser)}
        dashboardHref={homeFor(sessionUser?.role ?? null)}
        registrationOpen={gates.registrationOpen}
        closedLabel={
          gates.registrationNotYetOpen
            ? `Opens ${formatISTDate(gates.registrationOpensAt)}`
            : "Registration closed"
        }
      />

      <main>
        <Hero
          gates={gates}
          countdown={countdown}
          startsAt={hackathon.startsAt}
          registrationsCount={data.registrationsCount}
          prizeHeadline={topPrize?.reward ?? "iPhone"}
        />
        <AboutSection />
        <TimelineSection events={data.timeline} />
        <PrizeSection prizes={data.prizes} />
        <FaqSection faqs={data.faqs} />
        <CtaSection
          registrationOpen={gates.registrationOpen}
          registrationClosesAt={hackathon.registrationClosesAt}
        />
      </main>

      <Footer />
    </>
  );
}
