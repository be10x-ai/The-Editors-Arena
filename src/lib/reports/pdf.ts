import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { HIRING_RECOMMENDATION_META } from "@/lib/constants";
import type { HiringReport, HiringReportRow } from "@/lib/reports/hiring-report";
import { formatIST, formatScore } from "@/lib/utils";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const INK = rgb(0.06, 0.06, 0.09);
const MUTED = rgb(0.42, 0.42, 0.5);
const ACCENT = rgb(0.44, 0.23, 0.83);
const RULE = rgb(0.87, 0.87, 0.9);

/**
 * Minimal layout engine over pdf-lib: a cursor that flows down the page and
 * starts a new one when it runs out of room. Enough for a report; not a
 * general-purpose typesetter.
 */
class Layout {
  private page: PDFPage;
  private y: number;

  constructor(
    private readonly doc: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.page = doc.addPage([A4.width, A4.height]);
    this.y = A4.height - MARGIN;
  }

  get width(): number {
    return A4.width - MARGIN * 2;
  }

  private ensure(space: number) {
    if (this.y - space < MARGIN + 24) {
      this.page = this.doc.addPage([A4.width, A4.height]);
      this.y = A4.height - MARGIN;
    }
  }

  gap(space: number) {
    this.ensure(space);
    this.y -= space;
  }

  newPage() {
    this.page = this.doc.addPage([A4.width, A4.height]);
    this.y = A4.height - MARGIN;
  }

  /** Greedy word wrap; returns the height consumed. */
  text(
    value: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      lineHeight?: number;
      indent?: number;
      maxWidth?: number;
    } = {},
  ) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.regular;
    const lineHeight = opts.lineHeight ?? size * 1.45;
    const indent = opts.indent ?? 0;
    const maxWidth = opts.maxWidth ?? this.width - indent;

    const paragraphs = String(value ?? "").split("\n");
    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      let line = "";

      const flush = () => {
        if (!line) return;
        this.ensure(lineHeight);
        this.page.drawText(line, {
          x: MARGIN + indent,
          y: this.y - size,
          size,
          font,
          color: opts.color ?? INK,
        });
        this.y -= lineHeight;
        line = "";
      };

      if (words.length === 0) {
        this.y -= lineHeight * 0.5;
        continue;
      }

      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
          flush();
          line = word;
        } else {
          line = candidate;
        }
      }
      flush();
    }
  }

  /** Label on the left, value on the right — used for all key/value rows. */
  keyValue(label: string, value: string, labelWidth = 132) {
    const size = 9.5;
    this.ensure(size * 1.6);
    this.page.drawText(label, {
      x: MARGIN,
      y: this.y - size,
      size,
      font: this.regular,
      color: MUTED,
    });

    const maxWidth = this.width - labelWidth;
    let printed = value || "—";
    while (
      this.bold.widthOfTextAtSize(printed, size) > maxWidth &&
      printed.length > 4
    ) {
      printed = `${printed.slice(0, -2)}…`;
    }

    this.page.drawText(printed, {
      x: MARGIN + labelWidth,
      y: this.y - size,
      size,
      font: this.bold,
      color: INK,
    });
    this.y -= size * 1.75;
  }

  rule(color = RULE) {
    this.ensure(10);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: A4.width - MARGIN, y: this.y },
      thickness: 0.75,
      color,
    });
    this.y -= 12;
  }

  /** Horizontal score bar, 0–10. */
  scoreBar(label: string, score: number) {
    const size = 9;
    const barWidth = 180;
    const labelWidth = 118;
    this.ensure(16);

    this.page.drawText(label, {
      x: MARGIN,
      y: this.y - size,
      size,
      font: this.regular,
      color: MUTED,
    });

    const trackX = MARGIN + labelWidth;
    this.page.drawRectangle({
      x: trackX,
      y: this.y - size - 1,
      width: barWidth,
      height: 6,
      color: rgb(0.91, 0.91, 0.94),
    });
    this.page.drawRectangle({
      x: trackX,
      y: this.y - size - 1,
      width: Math.max(1, (Math.min(score, 10) / 10) * barWidth),
      height: 6,
      color: ACCENT,
    });
    this.page.drawText(`${score.toFixed(1)} / 10`, {
      x: trackX + barWidth + 10,
      y: this.y - size,
      size,
      font: this.bold,
      color: INK,
    });

    this.y -= 16;
  }

  banner(title: string, subtitle: string) {
    this.ensure(56);
    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - 46,
      width: this.width,
      height: 46,
      color: rgb(0.96, 0.95, 0.99),
    });
    this.page.drawText(title, {
      x: MARGIN + 14,
      y: this.y - 20,
      size: 13,
      font: this.bold,
      color: INK,
    });
    this.page.drawText(subtitle, {
      x: MARGIN + 14,
      y: this.y - 36,
      size: 9,
      font: this.regular,
      color: MUTED,
    });
    this.y -= 58;
  }
}

function recommendationLabel(row: HiringReportRow): string {
  return HIRING_RECOMMENDATION_META[row.recommendation].label;
}

/** Renders the full hiring report as a PDF byte array. */
export async function renderHiringReportPdf(report: HiringReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${report.hackathonName} — Hiring Report`);
  doc.setAuthor("The Editor Arena");
  doc.setSubject("Post-event hiring evaluation");
  doc.setCreationDate(report.generatedAt);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const layout = new Layout(doc, regular, bold);

  // --- Cover ---------------------------------------------------------------
  layout.text("THE EDITOR ARENA", { size: 10, bold: true, color: ACCENT });
  layout.gap(6);
  layout.text("Hiring Evaluation Report", { size: 26, bold: true });
  layout.gap(2);
  layout.text(report.hackathonName, { size: 13, color: MUTED });
  layout.gap(18);
  layout.rule();

  layout.keyValue("Generated", formatIST(report.generatedAt));
  layout.keyValue("Registered", String(report.totalRegistered));
  layout.keyValue("Valid submissions", String(report.totalSubmitted));
  layout.keyValue("Judged submissions", String(report.totalJudged));
  layout.gap(10);
  layout.rule();
  layout.gap(4);

  layout.text("Summary ranking", { size: 13, bold: true });
  layout.gap(8);

  for (const row of report.rows.slice(0, 25)) {
    layout.keyValue(
      `${row.rank ? `#${row.rank}` : "—"}  ${row.contestantId}`,
      `${row.name} · ${formatScore(row.finalScore)} / 10 · ${recommendationLabel(row)}`,
      150,
    );
  }

  if (report.rows.length > 25) {
    layout.gap(4);
    layout.text(`+ ${report.rows.length - 25} more in the detail section.`, {
      size: 9,
      color: MUTED,
    });
  }

  // --- One section per contestant ------------------------------------------
  for (const row of report.rows) {
    layout.newPage();
    layout.banner(
      `${row.rank ? `Rank ${row.rank} · ` : ""}${row.contestantId} — ${row.name}`,
      `${recommendationLabel(row)} · Final score ${formatScore(row.finalScore)} / 10 · ${row.judgeCount} judge${row.judgeCount === 1 ? "" : "s"}`,
    );

    layout.text("Candidate", { size: 11, bold: true });
    layout.gap(6);
    layout.keyValue(
      "Experience",
      `${row.experienceYears} year${row.experienceYears === 1 ? "" : "s"}`,
    );
    layout.keyValue("Current role", row.jobRole);
    layout.keyValue("City", row.city);
    layout.keyValue("Software", row.softwareSkills.join(", ") || "—");
    layout.keyValue("Email", row.email);
    layout.keyValue("Phone", row.phone);
    layout.keyValue("Portfolio", row.portfolioUrl);
    if (row.linkedinUrl) layout.keyValue("LinkedIn", row.linkedinUrl);
    if (row.socialUrl) layout.keyValue("Instagram / YouTube", row.socialUrl);
    layout.keyValue("Submission", row.videoUrl ?? "—");
    layout.keyValue(
      "Uploaded",
      row.uploadedAt
        ? `${formatIST(row.uploadedAt)}${row.submissionStatus === "LATE" ? " (late)" : ""}`
        : "—",
    );

    layout.gap(8);
    layout.rule();
    layout.text("Scores by criterion (judge average)", { size: 11, bold: true });
    layout.gap(8);
    for (const criterion of row.criteriaAverages) {
      layout.scoreBar(
        `${criterion.label} (${Math.round(criterion.weight * 100)}%)`,
        criterion.average,
      );
    }
    layout.gap(4);
    layout.scoreBar("FINAL SCORE", row.finalScore ?? 0);
    if (row.spread !== null) {
      layout.gap(2);
      layout.text(
        `Judge spread: ${row.spread.toFixed(2)} points between the harshest and most generous scorer.`,
        { size: 8.5, color: MUTED },
      );
    }

    layout.gap(10);
    layout.rule();
    layout.text("Strengths", { size: 11, bold: true });
    layout.gap(6);
    for (const strength of row.strengths) {
      layout.text(`•  ${strength}`, { size: 9.5, indent: 4 });
    }

    layout.gap(8);
    layout.text("Weaknesses", { size: 11, bold: true });
    layout.gap(6);
    for (const weakness of row.weaknesses) {
      layout.text(`•  ${weakness}`, { size: 9.5, indent: 4 });
    }

    layout.gap(10);
    layout.rule();
    layout.text("Judge feedback", { size: 11, bold: true });
    layout.gap(8);

    if (row.judges.length === 0) {
      layout.text("No finalised scorecards for this submission.", {
        size: 9.5,
        color: MUTED,
      });
    }

    for (const judge of row.judges) {
      layout.text(
        `${judge.judgeName}${judge.judgeTitle ? ` — ${judge.judgeTitle}` : ""}`,
        { size: 10, bold: true },
      );
      layout.text(
        `Overall ${judge.overallScore.toFixed(1)} / 10 · criteria-weighted ${judge.computedScore.toFixed(2)} · ${HIRING_RECOMMENDATION_META[judge.recommendation].label}`,
        { size: 8.5, color: MUTED },
      );
      layout.gap(3);
      layout.text(judge.comment || "No written comment.", { size: 9.5, indent: 4 });
      layout.gap(9);
    }

    layout.rule();
    layout.text(`Hiring recommendation: ${recommendationLabel(row)}`, {
      size: 11,
      bold: true,
      color: ACCENT,
    });
  }

  return doc.save();
}
