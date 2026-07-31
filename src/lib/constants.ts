import type { EventStatus, HiringRecommendation } from "@prisma/client";

export const BRAND = {
  name: "The Editor's Arena",
  /** The official tagline. Edition-agnostic, so it survives future editions. */
  tagline: "India's Premier Video Editing Hackathon",
  themeLine: "Real Footage. Real Deadlines. Real Editing Talent.",
  organiser: "House of EduTech",
  supportEmail: "arena@houseofedutech.in",
} as const;

/**
 * The judging rubric. Weights are used for `Rating.computedScore`, the
 * criteria-derived sanity check shown next to each judge's holistic score.
 * Weights must sum to 1.
 */
export const RATING_CRITERIA = [
  {
    key: "creativity",
    label: "Creativity",
    weight: 0.2,
    help: "Original ideas, unexpected choices that still serve the brief.",
  },
  {
    key: "storytelling",
    label: "Storytelling",
    weight: 0.2,
    help: "Moment selection and narrative shape — does it read as one story?",
  },
  {
    key: "editingSkill",
    label: "Editing Skill",
    weight: 0.2,
    help: "Pacing, cut discipline, rhythm, and momentum.",
  },
  {
    key: "motionGraphics",
    label: "Motion Graphics",
    weight: 0.15,
    help: "Titles, captions and graphics — legible, on-brand, purposeful.",
  },
  {
    key: "soundDesign",
    label: "Sound Design",
    weight: 0.15,
    help: "Mix balance, music choice, SFX, dialogue clarity.",
  },
  {
    key: "technicalQuality",
    label: "Technical Quality",
    weight: 0.1,
    help: "Export settings, colour, frame rate, no glitches or artefacts.",
  },
] as const;

export type RatingCriterionKey = (typeof RATING_CRITERIA)[number]["key"];

export const CRITERIA_KEYS = RATING_CRITERIA.map((c) => c.key) as RatingCriterionKey[];

export const EVENT_STATUS_META: Record<
  EventStatus,
  { label: string; description: string; tone: string }
> = {
  NOT_STARTED: {
    label: "Not Started",
    description: "Registration is open. Task assets stay hidden.",
    tone: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  },
  RUNNING: {
    label: "Running",
    description: "Hackathon is live. Assets and ZIP password can be released.",
    tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  SUBMISSION_OPEN: {
    label: "Submission Open",
    description: "Contestants can upload their final video.",
    tone: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  // Steel while the jury works; gold only once the result is struck.
  JUDGING: {
    label: "Judging",
    description: "Uploads closed. Judges are scoring submissions.",
    tone: "bg-slate-400/15 text-slate-200 border-slate-400/30",
  },
  COMPLETED: {
    label: "Completed",
    description: "Scores locked, ranks published, hiring report available.",
    tone: "bg-amber-500/15 text-amber-300 border-amber-400/40",
  },
};

export const HIRING_RECOMMENDATION_META: Record<
  HiringRecommendation,
  { label: string; tone: string }
> = {
  STRONG_HIRE: {
    label: "Strong Hire",
    tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  HIRE: { label: "Hire", tone: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  FREELANCE_ROSTER: {
    label: "Freelance Roster",
    tone: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  KEEP_WARM: {
    label: "Keep Warm",
    tone: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  },
  NO_HIRE: {
    label: "No Hire",
    tone: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
};

export const SOFTWARE_OPTIONS = [
  "Adobe Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
  "Final Cut Pro",
  "CapCut",
  "Adobe Audition",
  "Photoshop",
  "Illustrator",
  "Blender",
  "Cinema 4D",
] as const;

export const JOB_ROLE_OPTIONS = [
  "Freelance Editor",
  "In-house Editor",
  "Agency Editor",
  "Student",
  "Between roles",
  "Content Creator",
  "Motion Designer",
  "Other",
] as const;

export const HEARD_FROM_OPTIONS = [
  "Instagram",
  "LinkedIn",
  "YouTube",
  "WhatsApp / Friend",
  "College / Institute",
  "Google Search",
  "Other",
] as const;

/** Number of top ranks that receive a prize (1 winner + 3 runners-up). */
export const PODIUM_SIZE = 4;

/** Chunk size used when streaming a file to Google Drive. */
export const DRIVE_UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;

export const ROUTES = {
  home: "/",
  register: "/register",
  login: "/login",
  leaderboard: "/leaderboard",
  dashboard: "/dashboard",
  submit: "/dashboard/submit",
  judge: "/judge",
  admin: "/admin",
} as const;
