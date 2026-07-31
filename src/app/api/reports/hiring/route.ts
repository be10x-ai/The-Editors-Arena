import { NextResponse } from "next/server";

import { recordAudit } from "@/lib/audit";
import { requireActiveHackathon } from "@/lib/hackathon";
import { getSessionUser } from "@/lib/rbac";
import { registrationsCsv, resultsCsv } from "@/lib/reports/csv";
import { renderHiringReportXlsx, renderRegistrationsXlsx } from "@/lib/reports/excel";
import { buildHiringReport } from "@/lib/reports/hiring-report";
import { renderHiringReportPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin-only report export.
 *   ?format=csv               → ranked results, one row per candidate
 *   ?format=registrations-csv → the full applicant pool
 *   ?format=pdf / xlsx / registrations → legacy binary exports, still reachable
 *     by URL but no longer linked from the UI
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get("format") ?? "pdf";
  const hackathon = await requireActiveHackathon();
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = hackathon.slug;

  const csvHeaders = (filename: string) => ({
    // text/csv with an explicit charset, so a browser downloads rather than
    // renders it and Excel reads the UTF-8 BOM correctly.
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  });

  try {
    if (format === "registrations-csv") {
      const csv = await registrationsCsv(hackathon.id);
      await recordAudit({
        actorId: user.id,
        actorRole: user.role,
        action: "report.exported",
        entity: "Hackathon",
        entityId: hackathon.id,
        meta: { format },
      });
      return new NextResponse(csv, {
        headers: csvHeaders(`${slug}-registrations-${stamp}.csv`),
      });
    }

    if (format === "csv") {
      const report = await buildHiringReport(hackathon.id);
      await recordAudit({
        actorId: user.id,
        actorRole: user.role,
        action: "report.exported",
        entity: "Hackathon",
        entityId: hackathon.id,
        meta: { format, rows: report.rows.length },
      });
      return new NextResponse(resultsCsv(report), {
        headers: csvHeaders(`${slug}-results-${stamp}.csv`),
      });
    }

    if (format === "registrations") {
      const buffer = await renderRegistrationsXlsx(hackathon.id);
      await recordAudit({
        actorId: user.id,
        actorRole: user.role,
        action: "report.exported",
        entity: "Hackathon",
        entityId: hackathon.id,
        meta: { format },
      });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${slug}-registrations-${stamp}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const report = await buildHiringReport(hackathon.id);

    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "report.exported",
      entity: "Hackathon",
      entityId: hackathon.id,
      meta: { format, rows: report.rows.length },
    });

    if (format === "xlsx") {
      const buffer = await renderHiringReportXlsx(report);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${slug}-hiring-report-${stamp}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdf = await renderHiringReportPdf(report);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}-hiring-report-${stamp}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[report] generation failed", error);
    return NextResponse.json(
      { error: "Could not generate that report." },
      { status: 500 },
    );
  }
}
