import { prisma } from "@/lib/prisma";
import { RATING_CRITERIA } from "@/lib/constants";
import type { HiringReport } from "@/lib/reports/hiring-report";

/**
 * RFC 4180 field escaping.
 *
 * Quote whenever the value contains a comma, quote, or newline, and double any
 * embedded quotes. A leading =, +, - or @ is prefixed with a single quote: Excel
 * and Sheets treat those as formulas, so an entrant whose name or portfolio field
 * starts with one would otherwise execute on open (CSV injection).
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(",")];
  for (const row of rows) lines.push(row.map(cell).join(","));
  // CRLF and a UTF-8 BOM, so Excel on Windows opens it as UTF-8 rather than
  // mangling names with non-ASCII characters.
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** The applicant pool: contact details, portfolio, and submission state. */
export async function registrationsCsv(hackathonId: string): Promise<string> {
  const contestants = await prisma.contestant.findMany({
    where: { hackathonId },
    orderBy: { createdAt: "asc" },
    include: { submission: true },
  });

  return toCsv(
    [
      "Contestant ID",
      "Full name",
      "Email",
      "Phone",
      "City",
      "Experience (years)",
      "Job role",
      "Software skills",
      "Portfolio URL",
      "Heard from",
      "Registered (IST)",
      "Status",
      "Submission status",
      "YouTube link",
      "Submitted at (IST)",
      "Late",
    ],
    contestants.map((c) => [
      c.contestantId,
      c.fullName,
      c.email,
      c.phone,
      c.city,
      c.experienceYears,
      c.jobRole,
      c.softwareSkills.join("; "),
      c.portfolioUrl,
      c.heardFrom ?? "",
      istStamp(c.createdAt),
      c.status,
      c.submission?.status ?? "NOT_SUBMITTED",
      c.submission?.youtubeUrl ?? "",
      istStamp(c.submission?.uploadedAt ?? null),
      c.submission?.isLate ? "Yes" : "No",
    ]),
  );
}

/** Ranked results with per-criterion averages and the consensus recommendation. */
export function resultsCsv(report: HiringReport): string {
  return toCsv(
    [
      "Rank",
      "Contestant ID",
      "Full name",
      "Email",
      "Phone",
      "City",
      "Final score",
      "Judges scored",
      "Spread",
      ...RATING_CRITERIA.map((c) => c.label),
      "Recommendation",
      "Submission status",
      "Video link",
      "Portfolio URL",
    ],
    report.rows.map((row) => {
      // criteriaAverages is an array of {key, average}; index it once per row
      // rather than scanning it per criterion column.
      const byKey = new Map(row.criteriaAverages.map((c) => [c.key, c.average]));
      return [
        row.rank ?? "",
        row.contestantId,
        row.name,
        row.email,
        row.phone,
        row.city,
        row.finalScore ?? "",
        row.judgeCount,
        row.spread ?? "",
        ...RATING_CRITERIA.map((c) => byKey.get(c.key) ?? ""),
        row.recommendation,
        row.submissionStatus,
        row.videoUrl ?? "",
        row.portfolioUrl ?? "",
      ];
    }),
  );
}

function istStamp(date: Date | null): string {
  if (!date) return "";
  // Written as plain IST wall-clock text, which is what a spreadsheet reader
  // expects — not an ISO string in UTC that silently reads 5h30m early.
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
