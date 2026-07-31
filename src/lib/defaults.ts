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
  judgesPerSubmission: 5,
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
      "Five judges score every submission independently against the published rubric.",
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
    reward: "₹1 Lakh",
    description:
      "Plus a fast-tracked hiring interview, a paid trial project, and your edit featured across our channels with full credit.",
    quantity: 1,
    icon: "crown",
    order: 1,
  },
  {
    position: 2,
    title: "Runner-up",
    reward: "₹10,000",
    description:
      "Two runners-up, ₹10,000 each. Plus a place on our vetted freelance roster and a hiring conversation.",
    quantity: 2,
    icon: "medal",
    order: 2,
  },
  {
    // Beyond PODIUM_SIZE — not a rank, so the UI labels it separately.
    position: 4,
    title: "Every valid participant",
    reward: "Individual scorecard",
    description:
      "A full breakdown of your scores on all six criteria plus written feedback from every judge who watched your edit.",
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
      "Five judges review every submission independently through the portal — no shared channel, no discussion until scoring is closed. Each judge scores six criteria from 0.0 to 10.0 (creativity, storytelling, editing skill, motion graphics, sound design, technical quality), gives a holistic overall score, and writes feedback.",
    order: 5,
  },
  {
    question: "How are winners selected?",
    answer:
      "Your final score is the average of the five judges' overall scores, to two decimal places. Rank 1 is the Champion and takes ₹1 Lakh; ranks 2 and 3 are the runners-up and take ₹10,000 each. Ties share a rank. The full leaderboard is published when results are announced, within 60 minutes of the submission deadline.",
    order: 6,
  },
  {
    question: "Will this lead to hiring?",
    answer:
      "That is the point of the event. The top performers go into our hiring funnel — a fast-tracked interview followed by a paid trial project. Strong submissions outside the podium go onto our vetted freelance roster. Every valid participant receives their individual scorecard, which is yours to use however you like.",
    order: 7,
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
  {
    name: "Senior Video Editor",
    email: "judge1@editorarena.in",
    title: "Senior Video Editor",
    organization: "House of EduTech",
    expertise: ["Long-form editing", "Podcast", "Pacing"],
    bio: "Cuts the flagship long-form output and knows exactly what a publishable edit looks like at volume.",
  },
  {
    name: "Creative Director",
    email: "judge2@editorarena.in",
    title: "Creative Director",
    organization: "House of EduTech",
    expertise: ["Narrative", "Brand", "Art direction"],
    bio: "Owns creative standards end to end and judges storytelling before technique.",
  },
  {
    name: "Motion Graphics Lead",
    email: "judge3@editorarena.in",
    title: "Motion Graphics Lead",
    organization: "House of EduTech",
    expertise: ["After Effects", "Typography", "Design systems"],
    bio: "Evaluates whether graphics carry meaning or just decorate the frame.",
  },
  {
    name: "Content Lead",
    email: "judge4@editorarena.in",
    title: "Content Lead",
    organization: "House of EduTech",
    expertise: ["Audience", "Retention", "Short-form"],
    bio: "Represents the client view — would this actually perform with a real audience?",
  },
  {
    name: "External Editor",
    email: "judge5@editorarena.in",
    title: "Independent Editor",
    organization: "External jury member",
    expertise: ["Documentary", "Sound design", "Colour"],
    bio: "The outside voice on the panel, so the result means something beyond our own team.",
  },
];
