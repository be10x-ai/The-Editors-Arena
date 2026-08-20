import type { EventStatus, HiringRecommendation } from "@prisma/client";

export const BRAND = {
  name: "The Editor's Arena",
  /** The official tagline. Edition-agnostic, so it survives future editions. */
  tagline: "India's Premier Video Editing Hackathon",
  themeLine: "Real Footage. Real Deadlines. Real Editing Talent.",
  organiser: "House of EduTech",
  supportEmail: "editpod5@houseofedtech.in",
} as const;

/**
 * Campaign-level numbers that appear as copy in more than one place — the entry
 * fee anchor, and the per-registration donation. Kept here rather than inlined
 * so the hero, the cause section and the FAQ can never disagree about what we
 * promised.
 */
export const CAMPAIGN = {
  /** Struck-through anchor. What a seat in this arena is actually worth. */
  entryFeeInr: 1200,
  /** Donated to the cause below for every completed registration. */
  donationPerRegistrationInr: 500,
  cause: {
    name: "Assam Flood Relief",
    /** Used where the sentence needs the full noun rather than a label. */
    longName: "the Assam Flood Relief fund",
  },
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
    tone: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  // Steel while the jury works; brand blue only once the result is struck.
  JUDGING: {
    label: "Judging",
    description: "Uploads closed. Judges are scoring submissions.",
    tone: "bg-slate-400/15 text-slate-200 border-slate-400/30",
  },
  COMPLETED: {
    label: "Completed",
    description: "Scores locked, ranks published, hiring report available.",
    tone: "bg-blue-500/20 text-blue-200 border-blue-400/45",
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
    tone: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
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
  "Adobe Audition",
  "Photoshop",
] as const;


/**
 * Experience buckets, as offered at registration. Shared with the profile
 * editor so a saved value always has a label to render back.
 */
export const EXPERIENCE_OPTIONS = [
  { value: "0", label: "Less than a year" },
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "4", label: "4 years" },
  { value: "5", label: "5 years" },
  { value: "7", label: "6–8 years" },
  { value: "10", label: "9+ years" },
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

/** Number of top ranks that receive a prize (1 winner + 2 runners-up). */
export const PODIUM_SIZE = 3;

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
