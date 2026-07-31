import { NextResponse } from "next/server";

import { integrationStatus } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe. Reports database reachability and which
 * integrations are wired up, without ever revealing credentials.
 */
export async function GET() {
  const started = Date.now();
  let database = false;
  let hackathon: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
    const active = await prisma.hackathon.findFirst({
      where: { isActive: true },
      select: { slug: true, status: true },
    });
    hackathon = active ? `${active.slug}:${active.status}` : null;
  } catch (error) {
    console.error("[health] database unreachable", error);
  }

  return NextResponse.json(
    {
      ok: database,
      database,
      hackathon,
      integrations: integrationStatus(),
      latencyMs: Date.now() - started,
    },
    { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
