"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { requireActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
import { faqSchema, prizeSchema, timelineEventSchema } from "@/lib/validations";
import {
  errorState,
  successState,
  toMessage,
  type ActionState,
} from "@/server/actions/types";

/**
 * An unchecked checkbox submits nothing. Forms pair the checkbox with a hidden
 * "false" so intent is explicit; absent entirely means "default to true".
 */
function readCheckbox(formData: FormData, name: string): boolean {
  const values = formData.getAll(name).map(String);
  return values.length === 0 ? true : values.includes("true");
}

function revalidateContent() {
  revalidatePath("/");
  revalidatePath("/admin/content");
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

export async function upsertFaq(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const parsed = faqSchema.safeParse({
    id: formData.get("id") || undefined,
    question: formData.get("question"),
    answer: formData.get("answer"),
    order: formData.get("order") ?? 0,
    isPublished: readCheckbox(formData, "isPublished"),
  });

  if (!parsed.success) {
    return errorState(
      "Check the question and answer.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const hackathon = await requireActiveHackathon();
  const input = parsed.data;

  const faq = input.id
    ? await prisma.faq.update({
        where: { id: input.id },
        data: {
          question: input.question,
          answer: input.answer,
          order: input.order,
          isPublished: input.isPublished,
        },
        select: { id: true },
      })
    : await prisma.faq.create({
        data: {
          hackathonId: hackathon.id,
          question: input.question,
          answer: input.answer,
          order: input.order,
          isPublished: input.isPublished,
        },
        select: { id: true },
      });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: input.id ? "faq.updated" : "faq.created",
    entity: "Faq",
    entityId: faq.id,
  });

  revalidateContent();
  return successState(input.id ? "FAQ updated." : "FAQ added.");
}

export async function deleteFaq(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return errorState("Missing FAQ.");

  await prisma.faq.delete({ where: { id } });
  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "faq.deleted",
    entity: "Faq",
    entityId: id,
  });

  revalidateContent();
  return successState("FAQ deleted.");
}

// ---------------------------------------------------------------------------
// Prizes
// ---------------------------------------------------------------------------

export async function upsertPrize(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const parsed = prizeSchema.safeParse({
    id: formData.get("id") || undefined,
    position: formData.get("position"),
    title: formData.get("title"),
    reward: formData.get("reward"),
    description: formData.get("description") ?? "",
    quantity: formData.get("quantity") ?? 1,
    icon: formData.get("icon") || "trophy",
    order: formData.get("order") ?? 0,
  });

  if (!parsed.success) {
    return errorState(
      "Check the prize details.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const hackathon = await requireActiveHackathon();
  const input = parsed.data;

  const prize = input.id
    ? await prisma.prize.update({
        where: { id: input.id },
        data: {
          position: input.position,
          title: input.title,
          reward: input.reward,
          description: input.description || null,
          quantity: input.quantity,
          icon: input.icon,
          order: input.order,
        },
        select: { id: true },
      })
    : await prisma.prize.create({
        data: {
          hackathonId: hackathon.id,
          position: input.position,
          title: input.title,
          reward: input.reward,
          description: input.description || null,
          quantity: input.quantity,
          icon: input.icon,
          order: input.order,
        },
        select: { id: true },
      });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: input.id ? "prize.updated" : "prize.created",
    entity: "Prize",
    entityId: prize.id,
  });

  revalidateContent();
  return successState(input.id ? "Prize updated." : "Prize added.");
}

export async function deletePrize(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return errorState("Missing prize.");

  await prisma.prize.delete({ where: { id } });
  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "prize.deleted",
    entity: "Prize",
    entityId: id,
  });

  revalidateContent();
  return successState("Prize deleted.");
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export async function upsertTimelineEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const parsed = timelineEventSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    occursAt: formData.get("occursAt"),
    order: formData.get("order") ?? 0,
    isPublished: readCheckbox(formData, "isPublished"),
  });

  if (!parsed.success) {
    return errorState(
      "Check the timeline entry.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const hackathon = await requireActiveHackathon();
  const input = parsed.data;

  const event = input.id
    ? await prisma.timelineEvent.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description || null,
          occursAt: input.occursAt,
          order: input.order,
          isPublished: input.isPublished,
        },
        select: { id: true },
      })
    : await prisma.timelineEvent.create({
        data: {
          hackathonId: hackathon.id,
          title: input.title,
          description: input.description || null,
          occursAt: input.occursAt,
          order: input.order,
          isPublished: input.isPublished,
        },
        select: { id: true },
      });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: input.id ? "timeline.updated" : "timeline.created",
    entity: "TimelineEvent",
    entityId: event.id,
  });

  revalidateContent();
  return successState(input.id ? "Timeline entry updated." : "Timeline entry added.");
}

export async function deleteTimelineEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return errorState("Missing timeline entry.");

  await prisma.timelineEvent.delete({ where: { id } });
  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "timeline.deleted",
    entity: "TimelineEvent",
    entityId: id,
  });

  revalidateContent();
  return successState("Timeline entry deleted.");
}
