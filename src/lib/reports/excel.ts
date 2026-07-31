import ExcelJS from "exceljs";

import { HIRING_RECOMMENDATION_META, RATING_CRITERIA } from "@/lib/constants";
import type { HiringReport } from "@/lib/reports/hiring-report";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/utils";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2E1065" },
};

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  row.fill = HEADER_FILL;
  row.height = 22;
  row.alignment = { vertical: "middle" };
}

function autoWidth(sheet: ExcelJS.Worksheet, min = 10, max = 52) {
  sheet.columns.forEach((column) => {
    let longest = min;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const length = String(cell.value ?? "").length + 2;
      if (length > longest) longest = length;
    });
    column.width = Math.min(longest, max);
  });
}

/**
 * Three-sheet workbook:
 *   Summary   — one row per candidate, the hiring decision view
 *   Scorecards — one row per judge per candidate, the audit view
 *   Criteria  — per-criterion averages for calibration analysis
 */
export async function renderHiringReportXlsx(report: HiringReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Editor's Arena";
  workbook.created = report.generatedAt;

  // --- Summary -------------------------------------------------------------
  const summary = workbook.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  summary.columns = [
    { header: "Rank", key: "rank" },
    { header: "Contestant ID", key: "contestantId" },
    { header: "Name", key: "name" },
    { header: "Final Score", key: "finalScore" },
    { header: "Judges", key: "judgeCount" },
    { header: "Judge Spread", key: "spread" },
    { header: "Recommendation", key: "recommendation" },
    { header: "Experience (yrs)", key: "experienceYears" },
    { header: "Current Role", key: "jobRole" },
    { header: "City", key: "city" },
    { header: "Software", key: "software" },
    { header: "Email", key: "email" },
    { header: "Phone", key: "phone" },
    { header: "Portfolio", key: "portfolioUrl" },
    { header: "LinkedIn", key: "linkedinUrl" },
    { header: "Instagram / YouTube", key: "socialUrl" },
    { header: "Submission", key: "videoUrl" },
    { header: "Uploaded At", key: "uploadedAt" },
    { header: "Status", key: "status" },
    { header: "Strengths", key: "strengths" },
    { header: "Weaknesses", key: "weaknesses" },
  ];

  styleHeader(summary.getRow(1));

  for (const row of report.rows) {
    summary.addRow({
      rank: row.rank ?? "",
      contestantId: row.contestantId,
      name: row.name,
      finalScore: row.finalScore ?? "",
      judgeCount: row.judgeCount,
      spread: row.spread ?? "",
      recommendation: HIRING_RECOMMENDATION_META[row.recommendation].label,
      experienceYears: row.experienceYears,
      jobRole: row.jobRole,
      city: row.city,
      software: row.softwareSkills.join(", "),
      email: row.email,
      phone: row.phone,
      portfolioUrl: row.portfolioUrl,
      linkedinUrl: row.linkedinUrl ?? "",
      socialUrl: row.socialUrl ?? "",
      videoUrl: row.videoUrl ?? "",
      uploadedAt: row.uploadedAt ? formatIST(row.uploadedAt) : "",
      status: row.submissionStatus,
      strengths: row.strengths.join(" · "),
      weaknesses: row.weaknesses.join(" · "),
    });
  }

  summary.getColumn("finalScore").numFmt = "0.00";
  summary.getColumn("spread").numFmt = "0.00";
  autoWidth(summary);

  // --- Scorecards ----------------------------------------------------------
  const scorecards = workbook.addWorksheet("Scorecards", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  scorecards.columns = [
    { header: "Contestant ID", key: "contestantId" },
    { header: "Name", key: "name" },
    { header: "Judge", key: "judge" },
    ...RATING_CRITERIA.map((criterion) => ({
      header: criterion.label,
      key: criterion.key,
    })),
    { header: "Overall", key: "overall" },
    { header: "Weighted", key: "computed" },
    { header: "Recommendation", key: "recommendation" },
    { header: "Comment", key: "comment" },
    { header: "Submitted At", key: "submittedAt" },
  ];

  styleHeader(scorecards.getRow(1));

  for (const row of report.rows) {
    for (const judge of row.judges) {
      scorecards.addRow({
        contestantId: row.contestantId,
        name: row.name,
        judge: judge.judgeName,
        ...judge.scores,
        overall: judge.overallScore,
        computed: judge.computedScore,
        recommendation: HIRING_RECOMMENDATION_META[judge.recommendation].label,
        comment: judge.comment,
        submittedAt: judge.submittedAt ? formatIST(judge.submittedAt) : "",
      });
    }
  }

  scorecards.getColumn("comment").alignment = { wrapText: true, vertical: "top" };
  autoWidth(scorecards, 10, 70);

  // --- Criteria averages ---------------------------------------------------
  const criteria = workbook.addWorksheet("Criteria", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  criteria.columns = [
    { header: "Contestant ID", key: "contestantId" },
    { header: "Name", key: "name" },
    ...RATING_CRITERIA.map((criterion) => ({
      header: `${criterion.label} (${Math.round(criterion.weight * 100)}%)`,
      key: criterion.key,
    })),
    { header: "Final Score", key: "finalScore" },
  ];

  styleHeader(criteria.getRow(1));

  for (const row of report.rows) {
    criteria.addRow({
      contestantId: row.contestantId,
      name: row.name,
      ...Object.fromEntries(
        row.criteriaAverages.map((average) => [average.key, average.average]),
      ),
      finalScore: row.finalScore ?? "",
    });
  }

  autoWidth(criteria);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Registration export — the full applicant pool, which is useful as a hiring
 * database even for people who never competed.
 */
export async function renderRegistrationsXlsx(hackathonId: string): Promise<Buffer> {
  const contestants = await prisma.contestant.findMany({
    where: { hackathonId },
    orderBy: { contestantId: "asc" },
    include: {
      submission: {
        select: { status: true, uploadedAt: true, videoUrl: true, averageScore: true },
      },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Editor's Arena";

  const sheet = workbook.addWorksheet("Registrations", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Contestant ID", key: "contestantId" },
    { header: "Name", key: "fullName" },
    { header: "Email", key: "email" },
    { header: "Phone", key: "phone" },
    { header: "City", key: "city" },
    { header: "Experience (yrs)", key: "experienceYears" },
    { header: "Current Role", key: "jobRole" },
    { header: "Software", key: "software" },
    { header: "Portfolio", key: "portfolioUrl" },
    { header: "LinkedIn", key: "linkedinUrl" },
    { header: "Instagram / YouTube", key: "socialUrl" },
    { header: "Heard From", key: "heardFrom" },
    { header: "Registration Date", key: "registeredAt" },
    { header: "Status", key: "status" },
    { header: "Submission Status", key: "submissionStatus" },
    { header: "Submitted At", key: "uploadedAt" },
    { header: "Video URL", key: "videoUrl" },
    { header: "Final Score", key: "finalScore" },
    { header: "Rank", key: "rank" },
  ];

  styleHeader(sheet.getRow(1));

  for (const contestant of contestants) {
    sheet.addRow({
      contestantId: contestant.contestantId,
      fullName: contestant.fullName,
      email: contestant.email,
      phone: contestant.phone,
      city: contestant.city,
      experienceYears: contestant.experienceYears,
      jobRole: contestant.jobRole,
      software: contestant.softwareSkills.join(", "),
      portfolioUrl: contestant.portfolioUrl,
      linkedinUrl: contestant.linkedinUrl ?? "",
      socialUrl: contestant.socialUrl ?? "",
      heardFrom: contestant.heardFrom ?? "",
      registeredAt: formatIST(contestant.registeredAt),
      status: contestant.status,
      submissionStatus: contestant.submission?.status ?? "NOT_SUBMITTED",
      uploadedAt: contestant.submission?.uploadedAt
        ? formatIST(contestant.submission.uploadedAt)
        : "",
      videoUrl: contestant.submission?.videoUrl ?? "",
      finalScore: contestant.finalScore ?? "",
      rank: contestant.rank ?? "",
    });
  }

  sheet.getColumn("finalScore").numFmt = "0.00";
  autoWidth(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
