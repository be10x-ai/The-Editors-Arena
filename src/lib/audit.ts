import type { Prisma, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Fire-and-forget audit trail. Never throws — an audit write failing must not
 * roll back the action it was recording.
 */
export async function recordAudit(input: {
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: input.meta,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record", input.action, error);
  }
}
