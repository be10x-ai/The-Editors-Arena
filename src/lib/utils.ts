import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const IST = "Asia/Kolkata";

/** IST is a fixed +05:30 with no DST, so a constant offset is exact here. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * 23:59 IST on the IST day containing `fromMs`, as an epoch millisecond.
 *
 * Lives here rather than in `lib/hackathon` because the countdown timer is a
 * client component and that module pulls in Prisma.
 */
export function endOfISTDay(fromMs: number): number {
  const istDayStart = Math.floor((fromMs + IST_OFFSET_MS) / 86_400_000) * 86_400_000;
  return istDayStart + 86_400_000 - 60_000 - IST_OFFSET_MS;
}

/** Formats a date in the event timezone — the only timezone participants care about. */
export function formatIST(
  date: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...opts,
  }).format(d);
}

export function formatISTDate(date: Date | string | null | undefined): string {
  return formatIST(date, { hour: undefined, minute: undefined, hour12: undefined });
}

/**
 * Formats a date for an `<input type="datetime-local">` in IST.
 *
 * The browser has no timezone override for these inputs, so admins in any
 * location edit event times in the timezone the event actually runs in. The
 * matching parse lives in `istDateTime` (lib/validations).
 */
export function toISTInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  // en-CA gives ISO-ordered parts; hour can come back as "24" at midnight.
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/**
 * Rupees in Indian digit grouping — ₹1,20,000, not ₹120,000. Whole rupees only;
 * every amount we display (fees, prizes, donations) is a round number.
 */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Pulls a rupee amount out of a free-text reward string ("₹50,000", "50000 INR").
 * Prize rewards are admin-editable prose — "iPhone 16", "Individual scorecard" —
 * so anything without digits returns null rather than 0, and a caller summing a
 * prize pool can tell "not a cash prize" apart from "zero rupees".
 */
export function parseInrAmount(reward: string): number | null {
  const digits = reward.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Indian short scale — ₹1.8 Lakh, ₹1.2 Crore. Used where the exact rupee is
 * noise and the magnitude is the point (a prize pool headline, a stat tile).
 */
export function formatInrCompact(amount: number): string {
  const trim = (value: number) =>
    value.toFixed(2).replace(/\.?0+$/, "");
  if (amount >= 10_000_000) return `₹${trim(amount / 10_000_000)} Crore`;
  if (amount >= 100_000) return `₹${trim(amount / 100_000)} Lakh`;
  return formatInr(amount);
}

export function formatBytes(bytes: number | bigint | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Scores are always shown to two decimals — 8.84, never 8.8400001. */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return score.toFixed(2);
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Never let a user-supplied string become part of a Drive filename verbatim. */
export function safeFileSegment(input: string): string {
  return input.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function truncate(value: string, max = 140): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
