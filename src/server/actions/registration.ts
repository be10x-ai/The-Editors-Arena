"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";

import { recordAudit } from "@/lib/audit";
import { registrationEmail } from "@/lib/email/templates";
import { scheduleRemindersForContestant } from "@/lib/email/reminders";
import { sendMail } from "@/lib/email/send";
import { mintContestantId } from "@/lib/contestant-id";
import { syncContestant } from "@/lib/google/sheets";
import { computeGates, getActiveHackathon } from "@/lib/hackathon";
import { prisma } from "@/lib/prisma";
import { clientKey, hit, LIMITS } from "@/lib/rate-limit";
import { registrationSchema } from "@/lib/validations";
import { errorState, successState, type ActionState } from "@/server/actions/types";

export type RegistrationResult = { contestantId: string; email: string };

/**
 * Public registration.
 *
 * Order matters: the contestant row and their ID are committed first, then the
 * side effects (email, reminders, sheet) run best-effort. A mail outage must
 * never cost someone their entry.
 */
export async function registerContestant(
  _prev: ActionState<RegistrationResult>,
  formData: FormData,
): Promise<ActionState<RegistrationResult>> {
  const requestHeaders = await headers();
  const limit = hit(
    clientKey(requestHeaders, "register"),
    LIMITS.register.limit,
    LIMITS.register.window,
  );
  if (!limit.ok) {
    return errorState(
      `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    );
  }

  const raw = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    experienceYears: formData.get("experienceYears"),
    jobRole: formData.get("jobRole"),
    softwareSkills: formData.getAll("softwareSkills").filter(Boolean),
    portfolioUrl: formData.get("portfolioUrl"),
    heardFrom: formData.get("heardFrom") ?? undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
  };

  /**
   * Echoed back on rejection so the form can refill itself — React 19 resets an
   * uncontrolled form once its action settles, and re-typing a twenty-field
   * form is not acceptable. Passwords are deliberately excluded.
   */
  const echo: Record<string, string | string[]> = {
    fullName: String(raw.fullName ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    city: String(raw.city ?? ""),
    experienceYears: String(raw.experienceYears ?? ""),
    jobRole: String(raw.jobRole ?? ""),
    softwareSkills: raw.softwareSkills.map(String),
    portfolioUrl: String(raw.portfolioUrl ?? ""),
    heardFrom: String(raw.heardFrom ?? ""),
  };

  const parsed = registrationSchema.safeParse(raw);

  if (!parsed.success) {
    return errorState(
      "Please fix the highlighted fields.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
      echo,
    );
  }

  const input = parsed.data;

  const hackathon = await getActiveHackathon();
  if (!hackathon) {
    return errorState(
      "Registration is not open yet. Please check back shortly.",
      undefined,
      echo,
    );
  }

  const gates = computeGates(hackathon);
  if (!gates.registrationOpen) {
    return errorState(
      hackathon.status === "NOT_STARTED"
        ? "Registration has closed for this edition."
        : "The hackathon has already started, so registration is closed.",
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, contestant: { select: { contestantId: true } } },
  });
  if (existing) {
    return errorState(
      existing.contestant
        ? `This email is already registered as ${existing.contestant.contestantId}. Sign in instead.`
        : "This email already has an account. Sign in instead.",
      { email: ["Already registered"] },
      echo,
    );
  }

  let created: { id: string; contestantId: string; email: string } | null = null;

  const passwordHash = await bcrypt.hash(input.password, 10);

  // The unique index on contestantId is the real guard; two entrants hitting
  // submit in the same millisecond retry rather than collide.
  for (let attempt = 0; attempt < 4 && !created; attempt += 1) {
    try {
      created = await prisma.$transaction(async (tx) => {
        const contestantId = await mintContestantId(tx, hackathon);

        const user = await tx.user.create({
          data: {
            email: input.email,
            name: input.fullName,
            role: "CONTESTANT",
            passwordHash,
          },
          select: { id: true },
        });

        const contestant = await tx.contestant.create({
          data: {
            contestantId,
            userId: user.id,
            hackathonId: hackathon.id,
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            city: input.city,
            experienceYears: input.experienceYears,
            jobRole: input.jobRole,
            softwareSkills: input.softwareSkills,
            portfolioUrl: input.portfolioUrl,
            heardFrom: input.heardFrom,
            status: "REGISTERED",
          },
          select: { id: true, contestantId: true, email: true },
        });

        // Submission row exists from day one so the dashboard has no null case.
        await tx.submission.create({
          data: {
            contestantId: contestant.id,
            hackathonId: hackathon.id,
            status: "NOT_SUBMITTED",
          },
        });

        return contestant;
      });
    } catch (error) {
      const isDuplicate =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      const target = String(
        (error as Prisma.PrismaClientKnownRequestError)?.meta?.target ?? "",
      );

      if (isDuplicate && target.includes("email")) {
        return errorState("This email is already registered. Sign in instead.", {
          email: ["Already registered"],
        });
      }
      if (isDuplicate && attempt < 3) continue;

      console.error("[register] failed", error);
      return errorState("We could not complete your registration. Please try again.");
    }
  }

  if (!created) {
    return errorState("We could not complete your registration. Please try again.");
  }

  await recordAudit({
    action: "contestant.registered",
    entity: "Contestant",
    entityId: created.id,
    meta: { contestantId: created.contestantId, email: created.email },
  });

  // --- Best-effort side effects -------------------------------------------
  const confirmation = registrationEmail({
    name: input.fullName,
    contestantId: created.contestantId,
    hackathon,
  });

  const [emailResult] = await Promise.all([
    sendMail(created.email, confirmation),
    scheduleRemindersForContestant(
      { id: created.id, email: created.email, hackathonId: hackathon.id },
      hackathon,
    ).catch((error) => {
      console.error("[register] could not schedule reminders", error);
    }),
    syncContestant(created.id).catch((error) => {
      console.error("[register] sheet sync failed", error);
    }),
  ]);

  await prisma.emailReminder
    .upsert({
      where: {
        contestantId_type: {
          contestantId: created.id,
          type: "REGISTRATION_CONFIRMATION",
        },
      },
      create: {
        hackathonId: hackathon.id,
        contestantId: created.id,
        type: "REGISTRATION_CONFIRMATION",
        toEmail: created.email,
        subject: confirmation.subject,
        scheduledFor: new Date(),
        status: emailResult.ok ? "SENT" : "FAILED",
        sentAt: emailResult.ok ? new Date() : null,
        providerMessageId: emailResult.ok ? emailResult.messageId : null,
        lastError: emailResult.ok ? null : emailResult.error.slice(0, 500),
        attempts: 1,
      },
      update: {},
    })
    .catch((error) => console.error("[register] reminder log failed", error));

  return successState("Registration complete.", {
    contestantId: created.contestantId,
    email: created.email,
  });
}
