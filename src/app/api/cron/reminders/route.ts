import { NextResponse } from "next/server";

import { processDueReminders } from "@/lib/email/reminders";
import { env } from "@/lib/env";
import { purgeExpiredOtps } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Reminder queue drain. Wired to Vercel Cron (see vercel.json) every 15 minutes.
 *
 * Authorisation: `Authorization: Bearer $CRON_SECRET`. Vercel Cron sends this
 * automatically once CRON_SECRET is set on the project.
 */
async function run(request: Request) {
  if (!env.cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on this deployment." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "").trim();

  if (provided !== env.cronSecret) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const started = Date.now();
  const summary = await processDueReminders(150);
  const purgedOtps = await purgeExpiredOtps();

  return NextResponse.json({
    ok: true,
    ...summary,
    purgedOtps,
    durationMs: Date.now() - started,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
