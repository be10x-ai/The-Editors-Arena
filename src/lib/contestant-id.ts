import type { Prisma } from "@prisma/client";

/**
 * Mints the next human-facing contestant ID: `EA` + year + 4-digit sequence.
 *
 *   EA20260001, EA20260002, EA20260003, …
 *
 * Sequence is per hackathon edition. The counter is derived from the highest
 * existing ID rather than a separate counter row, and the call is made inside
 * the registration transaction — combined with the unique index on
 * `contestants.contestantId`, a lost race surfaces as P2002 and is retried by
 * the caller instead of silently issuing a duplicate.
 */
export async function mintContestantId(
  tx: Prisma.TransactionClient,
  hackathon: { id: string; idPrefix: string; idYear: number },
): Promise<string> {
  const prefix = `${hackathon.idPrefix}${hackathon.idYear}`;

  const latest = await tx.contestant.findFirst({
    where: { hackathonId: hackathon.id, contestantId: { startsWith: prefix } },
    orderBy: { contestantId: "desc" },
    select: { contestantId: true },
  });

  const lastSequence = latest ? Number(latest.contestantId.slice(prefix.length)) : 0;
  const next = (Number.isFinite(lastSequence) ? lastSequence : 0) + 1;

  // 4 digits covers 9,999 entrants; wider cohorts simply grow the number.
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function isContestantId(value: string): boolean {
  return /^[A-Z]{2}\d{8,}$/.test(value.trim());
}
