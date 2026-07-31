"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";

import { hashPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { judgeInviteEmail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";
import { requireActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/rbac";
import { persistRanking, recalculateSubmissionScore } from "@/lib/scoring";
import { judgeSchema } from "@/lib/validations";
import {
  errorState,
  successState,
  toMessage,
  type ActionState,
} from "@/server/actions/types";

function temporaryPassword(): string {
  // 12 URL-safe characters, ~72 bits of entropy. Emailed once, then changed.
  return crypto.randomBytes(9).toString("base64url");
}

/** Creates or updates a judge, including their login account. */
export async function upsertJudge(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  // An unchecked checkbox sends nothing, so the edit form pairs it with a hidden
  // "false". Reading every value lets both forms express intent unambiguously.
  const activeValues = formData.getAll("isActive").map(String);
  const isActive = activeValues.length === 0 ? true : activeValues.includes("true");

  const parsed = judgeSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    email: formData.get("email"),
    title: formData.get("title") ?? "",
    organization: formData.get("organization") ?? "",
    expertise: String(formData.get("expertise") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    bio: formData.get("bio") ?? "",
    isActive,
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) {
    return errorState(
      "Check the judge details.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const input = parsed.data;
  const hackathon = await requireActiveHackathon();
  const sendInvite = formData.get("sendInvite") === "on";

  try {
    if (input.id) {
      const judge = await prisma.judge.findUnique({
        where: { id: input.id },
        select: { id: true, userId: true, email: true },
      });
      if (!judge) return errorState("That judge no longer exists.");

      await prisma.$transaction([
        prisma.judge.update({
          where: { id: judge.id },
          data: {
            name: input.name,
            email: input.email,
            title: input.title || null,
            organization: input.organization || null,
            expertise: input.expertise,
            bio: input.bio || null,
            isActive: input.isActive,
          },
        }),
        prisma.user.update({
          where: { id: judge.userId },
          data: {
            name: input.name,
            email: input.email,
            isActive: input.isActive,
            ...(input.password
              ? { passwordHash: await hashPassword(input.password) }
              : {}),
          },
        }),
      ]);

      await recordAudit({
        actorId: user.id,
        actorRole: user.role,
        action: "judge.updated",
        entity: "Judge",
        entityId: judge.id,
        meta: { email: input.email, passwordReset: Boolean(input.password) },
      });

      revalidatePath("/admin/judges");
      return successState(`${input.name} updated.`);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, role: true },
    });
    if (existingUser && existingUser.role !== "JUDGE") {
      return errorState(
        "That email already belongs to a contestant or admin account. Use a different address.",
      );
    }

    const password = input.password || temporaryPassword();
    const passwordHash = await hashPassword(password);

    const judge = await prisma.$transaction(async (tx) => {
      const account = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: { name: input.name, role: "JUDGE", passwordHash, isActive: true },
            select: { id: true },
          })
        : await tx.user.create({
            data: {
              email: input.email,
              name: input.name,
              role: "JUDGE",
              passwordHash,
              emailVerified: new Date(),
            },
            select: { id: true },
          });

      return tx.judge.create({
        data: {
          userId: account.id,
          name: input.name,
          email: input.email,
          title: input.title || null,
          organization: input.organization || null,
          expertise: input.expertise,
          bio: input.bio || null,
          isActive: input.isActive,
        },
        select: { id: true },
      });
    });

    if (sendInvite) {
      await sendMail(
        input.email,
        judgeInviteEmail({
          name: input.name,
          email: input.email,
          password,
          hackathon,
        }),
      );
    }

    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "judge.created",
      entity: "Judge",
      entityId: judge.id,
      meta: { email: input.email, invited: sendInvite },
    });

    revalidatePath("/admin/judges");
    return successState(
      sendInvite
        ? `${input.name} added and invited by email.`
        : `${input.name} added. Temporary password: ${password}`,
    );
  } catch (error) {
    console.error("[judges] upsert failed", error);
    return errorState("Could not save that judge.");
  }
}

/** Assigns or unassigns one judge to one submission. */
export async function toggleAssignment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const judgeId = String(formData.get("judgeId") ?? "");
  const submissionId = String(formData.get("submissionId") ?? "");
  const assign = formData.get("assign") === "true";

  if (!judgeId || !submissionId) return errorState("Missing judge or submission.");

  if (assign) {
    await prisma.judgeAssignment.upsert({
      where: { judgeId_submissionId: { judgeId, submissionId } },
      create: { judgeId, submissionId },
      update: {},
    });
  } else {
    const rating = await prisma.rating.findUnique({
      where: { submissionId_judgeId: { submissionId, judgeId } },
      select: { isSubmitted: true },
    });
    if (rating?.isSubmitted) {
      return errorState(
        "That judge already submitted a scorecard. Unlock and clear it before unassigning.",
      );
    }
    await prisma.judgeAssignment.deleteMany({ where: { judgeId, submissionId } });
  }

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: assign ? "assignment.created" : "assignment.removed",
    entity: "Submission",
    entityId: submissionId,
    meta: { judgeId },
  });

  revalidatePath("/admin/assignments");
  revalidatePath("/judge");
  return successState(assign ? "Assigned." : "Unassigned.");
}

/**
 * Fans every valid submission out to N judges, round-robin.
 *
 * Round-robin over a judge list rotated per submission gives each judge a near
 * equal load without any judge seeing a contiguous block of the same entrants.
 */
export async function autoAssignSubmissions(): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const hackathon = await requireActiveHackathon();

  const [judges, submissions] = await Promise.all([
    prisma.judge.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
    prisma.submission.findMany({
      where: { hackathonId: hackathon.id, status: { in: ["SUBMITTED", "LATE"] } },
      orderBy: { uploadedAt: "asc" },
      select: { id: true },
    }),
  ]);

  if (judges.length === 0) return errorState("Add at least one active judge first.");
  if (submissions.length === 0)
    return errorState("There are no submissions to assign yet.");

  const perSubmission = Math.min(hackathon.judgesPerSubmission, judges.length);
  const pairs: { judgeId: string; submissionId: string }[] = [];

  submissions.forEach((submission, index) => {
    for (let offset = 0; offset < perSubmission; offset += 1) {
      const judge = judges[(index + offset) % judges.length];
      pairs.push({ judgeId: judge.id, submissionId: submission.id });
    }
  });

  const result = await prisma.judgeAssignment.createMany({
    data: pairs,
    skipDuplicates: true,
  });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "assignments.auto_generated",
    entity: "Hackathon",
    entityId: hackathon.id,
    meta: {
      submissions: submissions.length,
      judges: judges.length,
      perSubmission,
      created: result.count,
    },
  });

  revalidatePath("/admin/assignments");
  revalidatePath("/judge");

  return successState(
    `Created ${result.count} new assignment${result.count === 1 ? "" : "s"} — ${perSubmission} judge${perSubmission === 1 ? "" : "s"} per submission across ${submissions.length} submission${submissions.length === 1 ? "" : "s"}.`,
  );
}

/**
 * Reopens a finalised scorecard so a judge can correct it.
 * The unlock is recorded on the rating itself, not just in the audit log.
 */
export async function unlockRating(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertAdmin();
  } catch (error) {
    return errorState(toMessage(error));
  }

  const ratingId = String(formData.get("ratingId") ?? "");
  if (!ratingId) return errorState("Missing rating.");

  const rating = await prisma.rating.findUnique({
    where: { id: ratingId },
    select: { id: true, submissionId: true, judgeId: true, isSubmitted: true },
  });
  if (!rating) return errorState("That scorecard no longer exists.");
  if (!rating.isSubmitted) return successState("That scorecard is already editable.");

  await prisma.rating.update({
    where: { id: ratingId },
    data: {
      isSubmitted: false,
      submittedAt: null,
      unlockedById: user.id,
      unlockedAt: new Date(),
    },
  });

  await prisma.judgeAssignment.updateMany({
    where: { judgeId: rating.judgeId, submissionId: rating.submissionId },
    data: { completedAt: null },
  });

  // The score no longer counts, so averages and ranks must move immediately.
  await recalculateSubmissionScore(rating.submissionId);
  const hackathon = await requireActiveHackathon();
  await persistRanking(hackathon.id);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "rating.unlocked",
    entity: "Rating",
    entityId: ratingId,
    meta: { submissionId: rating.submissionId, judgeId: rating.judgeId },
  });

  revalidatePath("/admin/ratings");
  revalidatePath("/judge");
  revalidatePath("/leaderboard");

  return successState("Scorecard unlocked. The judge can edit and resubmit it.");
}
