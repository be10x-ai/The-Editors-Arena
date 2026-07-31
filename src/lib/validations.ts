import { z } from "zod";

import { parseYoutubeId } from "@/lib/youtube";

const url = z.string().trim().url("Enter a full URL including https://").max(500);

/**
 * Parses a `<input type="datetime-local">` value as IST.
 *
 * A bare "2026-09-05T09:30" has no zone, so `new Date()` would read it in the
 * *server's* timezone — UTC on Vercel — silently shifting every event time by
 * 5h30m. Appending the offset makes the intent explicit. Full ISO strings with
 * their own zone pass straight through.
 */
export const istDateTime = z.union([z.string(), z.date()]).transform((value, ctx) => {
  if (value instanceof Date) return value;
  const raw = value.trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
  const normalised = hasZone ? raw : `${raw.length === 16 ? `${raw}:00` : raw}+05:30`;
  const parsed = new Date(normalised);
  if (Number.isNaN(parsed.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid date and time",
    });
    return z.NEVER;
  }
  return parsed;
});

export const registrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Please enter your full name")
      .max(120)
      .regex(/^[\p{L}\p{M}.'\- ]+$/u, "Letters, spaces, hyphens and apostrophes only"),
    email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
    phone: z
      .string()
      .trim()
      .min(10, "Enter a valid phone number")
      .max(20)
      .regex(/^[+0-9][0-9\s\-()]{8,19}$/, "Digits, spaces and + only"),
    city: z.string().trim().min(2, "Enter your city").max(80),
    experienceYears: z.coerce
      .number({ invalid_type_error: "Select your experience" })
      .int("Whole years only")
      .min(0)
      .max(50),
    jobRole: z.string().trim().min(2, "Select your current role").max(80),
    softwareSkills: z
      .array(z.string().trim().min(1).max(60))
      .min(1, "Pick at least one tool you work in")
      .max(15),
    portfolioUrl: url,
    heardFrom: z.string().trim().max(80).optional(),
    password: z.string().min(8, "Use at least 8 characters").max(200),
    confirmPassword: z.string().min(8, "Use at least 8 characters").max(200),
    consent: z.literal(true, {
      errorMap: () => ({ message: "You must accept the rules to register" }),
    }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const loginPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "At least 8 characters"),
});

export const otpRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const otpVerifySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const youtubeSubmissionSchema = z.object({
  youtubeUrl: z
    .string()
    .trim()
    .min(1, "Paste your YouTube link")
    .max(500)
    .refine((v) => parseYoutubeId(v) !== null, {
      message: "That is not a YouTube video link. Use the full watch or youtu.be URL.",
    }),
  /** Typed confirmation, because the link cannot be changed afterwards. */
  confirmFinal: z.literal(true, {
    errorMap: () => ({ message: "Tick the box to confirm this is your final edit" }),
  }),
});

export const ownProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Enter your full name")
    .max(120)
    .regex(/^[\p{L}\p{M}.'\- ]+$/u, "Letters, spaces, hyphens and apostrophes only"),
  /** Judge-only fields; ignored for other roles. */
  title: z.string().trim().max(120).optional().or(z.literal("")),
  organization: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(1500).optional().or(z.literal("")),
  expertise: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
});

export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(100)
      .regex(/[A-Za-z]/, "Include a letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const score = z.coerce
  .number()
  .min(0, "Minimum 0.0")
  .max(10, "Maximum 10.0")
  .refine((v) => Number.isFinite(v), "Enter a number")
  // One decimal place: 8.5 is fine, 8.55 is not.
  .refine((v) => Math.round(v * 10) === Number((v * 10).toFixed(4)), {
    message: "One decimal place only",
  });

export const ratingSchema = z.object({
  submissionId: z.string().cuid(),
  creativity: score,
  storytelling: score,
  editingSkill: score,
  motionGraphics: score,
  soundDesign: score,
  technicalQuality: score,
  overallScore: score,
  comment: z
    .string()
    .trim()
    .min(20, "Write at least a sentence — this goes into the hiring report")
    .max(4000),
  strengths: z.string().trim().max(2000).optional(),
  weaknesses: z.string().trim().max(2000).optional(),
  recommendation: z.enum([
    "STRONG_HIRE",
    "HIRE",
    "FREELANCE_ROSTER",
    "KEEP_WARM",
    "NO_HIRE",
  ]),
  /** Draft saves keep the scorecard editable; finalising locks it. */
  finalise: z.boolean().default(false),
});

export type RatingInput = z.infer<typeof ratingSchema>;

export const hackathonSettingsSchema = z.object({
  name: z.string().trim().min(3).max(120),
  tagline: z.string().trim().min(3).max(240),
  registrationOpensAt: istDateTime,
  registrationClosesAt: istDateTime,
  startsAt: istDateTime,
  taskReleaseAt: istDateTime,
  submissionDeadline: istDateTime,
  judgingEndsAt: istDateTime,
  resultsAt: istDateTime,
  maxUploadMb: z.coerce.number().int().min(50).max(20480),
  allowLateSubmission: z.boolean().default(false),
  judgesPerSubmission: z.coerce.number().int().min(1).max(15),
  sheetId: z.string().trim().max(200).optional().or(z.literal("")),
  sheetTabName: z.string().trim().min(1).max(80),
});

export const assetSettingsSchema = z.object({
  assetZipName: z.string().trim().min(3).max(160),
  assetDriveUrl: z
    .union([url, z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  assetDriveFileId: z.string().trim().max(200).optional().or(z.literal("")),
  assetZipPassword: z.string().trim().max(120).optional().or(z.literal("")),
});

export const faqSchema = z.object({
  id: z.string().cuid().optional(),
  question: z.string().trim().min(5).max(240),
  answer: z.string().trim().min(5).max(4000),
  order: z.coerce.number().int().min(0).max(999).default(0),
  isPublished: z.boolean().default(true),
});

export const prizeSchema = z.object({
  id: z.string().cuid().optional(),
  position: z.coerce.number().int().min(1).max(50),
  title: z.string().trim().min(2).max(120),
  reward: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  icon: z.string().trim().max(40).default("trophy"),
  order: z.coerce.number().int().min(0).max(999).default(0),
});

export const timelineEventSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  occursAt: istDateTime,
  order: z.coerce.number().int().min(0).max(999).default(0),
  isPublished: z.boolean().default(true),
});

export const judgeSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email(),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  organization: z.string().trim().max(120).optional().or(z.literal("")),
  expertise: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  bio: z.string().trim().max(1500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(100)
    .optional()
    .or(z.literal("")),
});

export const uploadSessionSchema = z.object({
  fileName: z.string().trim().min(3).max(255),
  mimeType: z.enum(["video/mp4", "video/quicktime"], {
    errorMap: () => ({ message: "Only MP4 and MOV files are accepted" }),
  }),
  sizeBytes: z.coerce
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024 * 1024),
});

export const completeUploadSchema = z.object({
  driveFileId: z.string().trim().min(5).max(200),
  fileName: z.string().trim().min(3).max(255),
  mimeType: z.string().trim().min(3).max(100),
  sizeBytes: z.coerce.number().int().nonnegative(),
});

export const eventStatusSchema = z.object({
  status: z.enum(["NOT_STARTED", "RUNNING", "SUBMISSION_OPEN", "JUDGING", "COMPLETED"]),
  note: z.string().trim().max(500).optional(),
});
