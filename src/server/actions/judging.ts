"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { computeGates, requireActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { assertJudge } from "@/lib/rbac";
import {
  persistRanking,
  recalculateSubmissionScore,
  weightedCriteriaScore,
} from "@/lib/scoring";
import { ratingSchema } from "@/lib/validations";
import {
  errorState,
  successState,
  toMessage,
  type ActionState,
} from "@/server/actions/types";

/**
 * Saves a judge's scorecard — as a draft, or finalised.
 *
 * Rules enforced here, not in the UI:
 *   • a judge may only score a submission they were assigned
 *   • a finalised scorecard is immutable to the judge (admin can unlock)
 *   • only finalised scorecards move the leaderboard
 */
export async function saveRating(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await assertJudge();
  } catch (error) {
    return errorState(toMessage(error, "You are not allowed to score submissions."));
  }

  const parsed = ratingSchema.safeParse({
    submissionId: formData.get("submissionId"),
    creativity: formData.get("creativity"),
    storytelling: formData.get("storytelling"),
    editingSkill: formData.get("editingSkill"),
    motionGraphics: formData.get("motionGraphics"),
    soundDesign: formData.get("soundDesign"),
    technicalQuality: formData.get("technicalQuality"),
    overallScore: formData.get("overallScore"),
    comment: formData.get("comment"),
    strengths: formData.get("strengths") ?? undefined,
    weaknesses: formData.get("weaknesses") ?? undefined,
    recommendation: formData.get("recommendation"),
    finalise: formData.get("finalise") === "true",
  });

  if (!parsed.success) {
    return errorState(
      "Check the scorecard — some fields need attention.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const input = parsed.data;

  // An admin acting as a judge needs a Judge row; scoring is attributable.
  const judgeId = user.judgeId;
  if (!judgeId) {
    return errorState(
      "Your account has no judge profile, so scores cannot be attributed. Ask an admin to add you as a judge.",
    );
  }

  const hackathon = await requireActiveHackathon();
  const gates = computeGates(hackathon);

  if (hackathon.judgingLocked) {
    return errorState("Judging is locked. Scores can no longer be changed.");
  }
  if (!gates.judgingOpen && user.role !== "ADMIN") {
    return errorState(
      hackathon.status === "COMPLETED"
        ? "This event is complete — scoring is closed."
        : "Judging has not opened yet.",
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { id: input.submissionId },
    select: {
      id: true,
      status: true,
      hackathonId: true,
      assignments: { where: { judgeId }, select: { id: true } },
      ratings: {
        where: { judgeId },
        select: { id: true, isSubmitted: true },
      },
    },
  });

  if (!submission || submission.hackathonId !== hackathon.id) {
    return errorState("That submission does not exist.");
  }
  if (submission.assignments.length === 0) {
    return errorState("You are not assigned to this submission.");
  }
  if (!["SUBMITTED", "LATE"].includes(submission.status)) {
    return errorState("That submission is not in a reviewable state.");
  }

  const existing = submission.ratings[0];
  if (existing?.isSubmitted) {
    return errorState(
      "You already submitted this scorecard. Scores are final — ask an admin to unlock it if something is wrong.",
    );
  }

  const criteria = {
    creativity: input.creativity,
    storytelling: input.storytelling,
    editingSkill: input.editingSkill,
    motionGraphics: input.motionGraphics,
    soundDesign: input.soundDesign,
    technicalQuality: input.technicalQuality,
  };

  const computedScore = weightedCriteriaScore(criteria);
  const now = new Date();

  try {
    const rating = await prisma.rating.upsert({
      where: { submissionId_judgeId: { submissionId: submission.id, judgeId } },
      create: {
        submissionId: submission.id,
        judgeId,
        ...criteria,
        overallScore: input.overallScore,
        computedScore,
        isSubmitted: input.finalise,
        submittedAt: input.finalise ? now : null,
        feedback: {
          create: {
            comment: input.comment,
            strengths: input.strengths || null,
            weaknesses: input.weaknesses || null,
            recommendation: input.recommendation,
          },
        },
      },
      update: {
        ...criteria,
        overallScore: input.overallScore,
        computedScore,
        isSubmitted: input.finalise,
        submittedAt: input.finalise ? now : null,
        feedback: {
          upsert: {
            create: {
              comment: input.comment,
              strengths: input.strengths || null,
              weaknesses: input.weaknesses || null,
              recommendation: input.recommendation,
            },
            update: {
              comment: input.comment,
              strengths: input.strengths || null,
              weaknesses: input.weaknesses || null,
              recommendation: input.recommendation,
            },
          },
        },
      },
      select: { id: true },
    });

    if (input.finalise) {
      await prisma.judgeAssignment.updateMany({
        where: { judgeId, submissionId: submission.id },
        data: { completedAt: now },
      });
      await recalculateSubmissionScore(submission.id);
      await persistRanking(hackathon.id);
    }

    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: input.finalise ? "rating.submitted" : "rating.draft_saved",
      entity: "Rating",
      entityId: rating.id,
      meta: {
        submissionId: submission.id,
        overallScore: input.overallScore,
        computedScore,
      },
    });
  } catch (error) {
    console.error("[judging] save failed", error);
    return errorState("Could not save that scorecard. Please try again.");
  }

  revalidatePath("/judge");
  revalidatePath(`/judge/review/${submission.id}`);
  revalidatePath("/admin/ratings");
  revalidatePath("/leaderboard");

  return successState(
    input.finalise
      ? "Scorecard submitted and locked."
      : "Draft saved. It stays editable until you submit.",
  );
}
