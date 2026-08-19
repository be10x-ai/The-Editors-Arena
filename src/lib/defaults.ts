/**
 * Canonical seed content for a new edition.
 *
 * Shared by `prisma/seed.ts` and by the landing page's offline fallback, so the
 * marketing copy exists in exactly one place. Dates follow the 2026 run-of-show
 * (event day: Saturday 5 September 2026, 09:30–15:45 IST).
 */

/** IST is UTC+5:30 — expressed here as a UTC instant so it is unambiguous. */
function ist(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30));
}

export const DEFAULT_HACKATHON = {
  slug: "editor-arena-2026",
  name: "The Editor's Arena 2026",
  tagline: "India's Video Editing Challenge to Discover Next Generation Editors",
  edition: 1,
  idYear: 2026,
  idPrefix: "EA",
  timezone: "Asia/Kolkata",
  registrationOpensAt: ist(2026, 8, 3, 10, 0),
  registrationClosesAt: ist(2026, 8, 29, 23, 59),
  startsAt: ist(2026, 9, 5, 9, 30),
  taskReleaseAt: ist(2026, 9, 5, 9, 30),
  submissionDeadline: ist(2026, 9, 5, 15, 45),
  judgingEndsAt: ist(2026, 9, 7, 21, 0),
  resultsAt: ist(2026, 9, 8, 18, 0),
  assetZipName: "Editor_Arena_Task_Files.zip",
  maxUploadMb: 4096,
  judgesPerSubmission: 3,
} as const;

export const DEFAULT_TIMELINE: {
  title: string;
  description: string;
  occursAt: Date;
  order: number;
}[] = [
  {
    title: "Registration Opens",
    description:
      "Applications open to editors across India. Register with a portfolio link — it takes two minutes.",
    occursAt: DEFAULT_HACKATHON.registrationOpensAt,
    order: 1,
  },
  {
    title: "Registration Closes",
    description:
      "Last moment to enter. No late registrations, no exceptions — the cohort is locked here.",
    occursAt: DEFAULT_HACKATHON.registrationClosesAt,
    order: 2,
  },
  {
    title: "Hackathon Begins",
    description:
      "Event goes live at 09:30 IST. Keep your dashboard open — everything happens there.",
    occursAt: DEFAULT_HACKATHON.startsAt,
    order: 3,
  },
  {
    title: "Task Released",
    description:
      "The footage ZIP unlocks on your dashboard and the ZIP password is announced at the same moment.",
    occursAt: DEFAULT_HACKATHON.taskReleaseAt,
    order: 4,
  },
  {
    title: "Submission Deadline",
    description:
      "Final video uploaded through the portal by 15:45 IST. Uploads close automatically.",
    occursAt: DEFAULT_HACKATHON.submissionDeadline,
    order: 5,
  },
  {
    title: "Judging",
    description:
      "Three judges score every submission independently against the published rubric.",
    occursAt: DEFAULT_HACKATHON.judgingEndsAt,
    order: 6,
  },
  {
    title: "Winner Announcement",
    description:
      "Winner and runners-up announced. Every participant receives an individual scorecard.",
    occursAt: DEFAULT_HACKATHON.resultsAt,
    order: 7,
  },
];

export const DEFAULT_PRIZES: {
  position: number;
  title: string;
  reward: string;
  description: string;
  quantity: number;
  icon: string;
  order: number;
}[] = [
  {
    position: 1,
    title: "Champion — The Editor's Arena 2026",
    reward: "₹1,00,000",
    description:
      "Plus a fast-tracked hiring interview, a paid trial project, and your edit featured across our channels with full credit.",
    quantity: 1,
    icon: "crown",
    order: 1,
  },
  {
    position: 2,
    title: "First Runner-up",
    reward: "₹50,000",
    description:
      "Plus the same hiring track as the champion — interview, paid trial project, and a place on our vetted freelance roster.",
    quantity: 1,
    icon: "medal",
    order: 2,
  },
  {
    position: 3,
    title: "Second Runner-up",
    reward: "₹30,000",
    description:
      "Plus a hiring conversation and a place on our vetted freelance roster.",
    quantity: 1,
    icon: "award",
    order: 3,
  },
];

export const DEFAULT_FAQS: { question: string; answer: string; order: number }[] = [
  {
    question: "Who can participate?",
    answer:
      "Any video editor based in India, aged 18 or above — freelance, in-house, agency, or student. Entries are individual, not team-based. You need your own machine, your own licensed editing software, and a stable internet connection for the download and upload.",
    order: 1,
  },
  {
    question: "What editing software can I use?",
    answer:
      "Any professional NLE you own a licence for — Premiere Pro, DaVinci Resolve, Final Cut Pro, or After Effects for graphics. We do not require a specific tool; we require that the work is yours.\n\nAI tools are allowed from a named whitelist published in the rulebook. Anything outside that list, or work produced by someone other than you, is grounds for disqualification.",
    order: 2,
  },
  {
    question: "How will I receive the assets?",
    answer:
      "Everything comes through your dashboard — nothing arrives by DM or WhatsApp. When the hackathon goes live, a download button appears with the task ZIP. The ZIP password stays hidden until the task timer starts, and appears on the same page at that moment. Neither is visible before the event begins.",
    order: 3,
  },
  {
    question: "What is the duration of the challenge?",
    answer:
      "One day. The event opens at 09:30 IST and the submission deadline is 15:45 IST the same day — roughly six hours of editing including breaks. Uploads close automatically at the deadline and there are no extensions, so plan your export and upload time into your schedule.",
    order: 4,
  },
  {
    question: "How will submissions be evaluated?",
    answer:
      "Three judges review every submission independently through the portal — no shared channel, no discussion until scoring is closed. Each judge scores six criteria from 0.0 to 10.0 (creativity, storytelling, editing skill, motion graphics, sound design, technical quality), gives a holistic overall score, and writes feedback.",
    order: 5,
  },
  {
    question: "How are winners selected?",
    answer:
      "Your final score is the average of the three judges' overall scores, to two decimal places. Rank 1 is the Champion and takes ₹1,00,000, rank 2 takes ₹50,000, and rank 3 takes ₹30,000. Ties share a rank. The full leaderboard is published when results are announced, within 60 minutes of the submission deadline.",
    order: 6,
  },
  {
    question: "Will this lead to hiring?",
    answer:
      "That is the point of the event. The top performers go into our hiring funnel — a fast-tracked interview followed by a paid trial project. Strong submissions outside the podium go onto our vetted freelance roster. Every valid participant receives their individual scorecard, which is yours to use however you like.",
    order: 7,
  },
  {
    question: "Does it cost anything to enter?",
    answer:
      "No. A seat in this arena is worth ₹1,200 — the brief, the licensed client footage, three judges watching your work, and a written scorecard at the end. For this edition it is free, and it stays free right through to the results. There is no fee at registration, no fee to submit, and nothing to pay if you win.",
    order: 8,
  },
  {
    question: "How does the Assam Flood Relief donation work?",
    answer:
      "For every completed registration, House of EduTech donates ₹500 to the Assam Flood Relief fund. Nothing is deducted from you and nothing is added — you register free, and we pay the ₹500. The running total is shown live on this page: registrations × ₹500. The final amount and the receiving organisation are published after registration closes.",
    order: 9,
  },
];

export const DEFAULT_JUDGES: {
  name: string;
  email: string;
  title: string;
  organization: string;
  expertise: string[];
  bio: string;
}[] = [
  // Interchangeable by design. Every judge scores the same six criteria against
  // the same rubric, so a seeded panel of specialists implied a division of
  // labour the scoring model does not have — and made the first seat look
  // senior to the rest. Admins rename each seat to the real person on the day.
  {
    name: "Jury 01",
    email: "judge1@theeditorsarena.in",
    title: "Jury member",
    organization: "House of EduTech",
    expertise: [],
    bio: "",
  },
  {
    name: "Jury 02",
    email: "judge2@theeditorsarena.in",
    title: "Jury member",
    organization: "House of EduTech",
    expertise: [],
    bio: "",
  },
  {
    name: "Jury 03",
    email: "judge3@theeditorsarena.in",
    title: "Jury member",
    organization: "House of EduTech",
    expertise: [],
    bio: "",
  },
];
