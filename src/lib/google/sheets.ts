import { env } from "@/lib/env";
import { sheetsClient } from "@/lib/google/client";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/utils";

/**
 * Google Sheets mirror of the registration table.
 *
 * The sheet is a convenience for the ops team, never a source of truth: every
 * write is keyed on Contestant ID in column A so a re-sync is idempotent and a
 * manual edit in the sheet is simply overwritten on the next update.
 */

export const SHEET_HEADERS = [
  "Contestant ID",
  "Name",
  "Email",
  "Phone",
  "City",
  "Experience (yrs)",
  "Current Role",
  "Software",
  "Portfolio",
  "LinkedIn",
  "Social",
  "Registration Date",
  "Status",
  "Submission Status",
  "Submitted At",
  "Video URL",
  "Final Score",
  "Rank",
] as const;

type SheetRow = (string | number)[];

function a1(tab: string, range: string): string {
  // Tab names with spaces or quotes must be quoted in A1 notation.
  return `'${tab.replace(/'/g, "''")}'!${range}`;
}

async function resolveTarget(hackathonId?: string) {
  const hackathon = hackathonId
    ? await prisma.hackathon.findUnique({ where: { id: hackathonId } })
    : await prisma.hackathon.findFirst({ where: { isActive: true } });

  const sheetId = hackathon?.sheetId || env.google.sheetId;
  const tab = hackathon?.sheetTabName || env.google.sheetTab || "Registrations";
  return { sheetId, tab };
}

/** Creates the tab if missing and writes/refreshes the header row. */
export async function ensureSheet(hackathonId?: string): Promise<void> {
  const { sheetId, tab } = await resolveTarget(hackathonId);
  if (!sheetId) return;

  const sheets = sheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tab);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tab } } }],
      },
    });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: a1(tab, "A1"),
    valueInputOption: "RAW",
    requestBody: { values: [[...SHEET_HEADERS]] },
  });
}

function buildRow(contestant: {
  contestantId: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  experienceYears: number;
  jobRole: string;
  softwareSkills: string[];
  portfolioUrl: string;
  linkedinUrl: string | null;
  socialUrl: string | null;
  registeredAt: Date;
  status: string;
  finalScore: number | null;
  rank: number | null;
  submission?: {
    status: string;
    uploadedAt: Date | null;
    videoUrl: string | null;
  } | null;
}): SheetRow {
  return [
    contestant.contestantId,
    contestant.fullName,
    contestant.email,
    contestant.phone,
    contestant.city,
    contestant.experienceYears,
    contestant.jobRole,
    contestant.softwareSkills.join(", "),
    contestant.portfolioUrl,
    contestant.linkedinUrl ?? "",
    contestant.socialUrl ?? "",
    formatIST(contestant.registeredAt),
    contestant.status,
    contestant.submission?.status ?? "NOT_SUBMITTED",
    contestant.submission?.uploadedAt
      ? formatIST(contestant.submission.uploadedAt)
      : "",
    contestant.submission?.videoUrl ?? "",
    contestant.finalScore ?? "",
    contestant.rank ?? "",
  ];
}

/** Row index (1-based) of a contestant ID in column A, or null if absent. */
async function findRowIndex(
  sheetId: string,
  tab: string,
  contestantId: string,
): Promise<number | null> {
  const sheets = sheetsClient();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: a1(tab, "A2:A100000"),
  });
  const rows = data.values ?? [];
  const index = rows.findIndex((row) => row[0] === contestantId);
  return index === -1 ? null : index + 2;
}

/**
 * Upserts one contestant. Called after registration, after upload, and after
 * ranking — always safe to call again.
 */
export async function syncContestant(contestantRowId: string): Promise<void> {
  const contestant = await prisma.contestant.findUnique({
    where: { id: contestantRowId },
    include: {
      submission: { select: { status: true, uploadedAt: true, videoUrl: true } },
    },
  });
  if (!contestant) return;

  const { sheetId, tab } = await resolveTarget(contestant.hackathonId);
  if (!sheetId) return;

  const sheets = sheetsClient();
  const row = buildRow(contestant);
  const existingRow = await findRowIndex(sheetId, tab, contestant.contestantId);

  if (existingRow) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(tab, `A${existingRow}`),
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: a1(tab, "A2"),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  }

  await prisma.contestant.update({
    where: { id: contestant.id },
    data: { sheetRowSyncedAt: new Date() },
  });
}

/** Full rewrite of the tab. Used by the admin "Re-sync sheet" button. */
export async function syncAllContestants(hackathonId: string): Promise<number> {
  const { sheetId, tab } = await resolveTarget(hackathonId);
  if (!sheetId) return 0;

  await ensureSheet(hackathonId);

  const contestants = await prisma.contestant.findMany({
    where: { hackathonId },
    orderBy: { contestantId: "asc" },
    include: {
      submission: { select: { status: true, uploadedAt: true, videoUrl: true } },
    },
  });

  const sheets = sheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: a1(tab, "A2:R100000"),
  });

  if (contestants.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: a1(tab, "A2"),
      valueInputOption: "RAW",
      requestBody: { values: contestants.map(buildRow) },
    });
  }

  const now = new Date();
  await prisma.contestant.updateMany({
    where: { hackathonId },
    data: { sheetRowSyncedAt: now },
  });

  return contestants.length;
}
