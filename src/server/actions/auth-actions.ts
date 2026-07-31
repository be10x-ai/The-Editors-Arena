"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hashPassword, signIn, signOut } from "@/lib/auth";
import { otpEmail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";
import { issueOtp, OTP_TTL } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { clientKey, hit, LIMITS } from "@/lib/rate-limit";
import { getSessionUser, homeFor } from "@/lib/rbac";
import {
  loginPasswordSchema,
  otpRequestSchema,
  otpVerifySchema,
  setPasswordSchema,
} from "@/lib/validations";
import { errorState, successState, type ActionState } from "@/server/actions/types";

/** Sends a six-digit login code. Always reports success — never leaks whether an email exists. */
export async function requestLoginCode(
  _prev: ActionState<{ email: string }>,
  formData: FormData,
): Promise<ActionState<{ email: string }>> {
  const requestHeaders = await headers();
  const limit = hit(
    clientKey(requestHeaders, "otp"),
    LIMITS.otpRequest.limit,
    LIMITS.otpRequest.window,
  );
  if (!limit.ok) {
    return errorState(
      `Too many code requests. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    );
  }

  const parsed = otpRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return errorState("Enter a valid email address.", {
      email: ["Enter a valid email address"],
    });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });

  if (user?.isActive) {
    const code = await issueOtp(email);
    const result = await sendMail(email, otpEmail({ code, ttlMinutes: OTP_TTL }));

    // In dry-run the code only exists in the server log; say so rather than
    // leaving the operator staring at an empty inbox.
    if (result.ok && result.skipped) {
      return successState(
        `Email sending is disabled (${result.reason}). The code was printed to the server console.`,
        { email },
      );
    }
  }

  return successState(
    `If an account exists for ${email}, a 6-digit code is on its way. It expires in ${OTP_TTL} minutes.`,
    { email },
  );
}

export async function signInWithOtp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = otpVerifySchema.safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
  });
  if (!parsed.success) {
    return errorState(
      "Enter the 6-digit code from your email.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const callbackUrl = String(formData.get("callbackUrl") || "");

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      otp: parsed.data.otp,
      redirectTo: callbackUrl || "/dashboard",
    });
  } catch (error) {
    // NEXT_REDIRECT is how a successful signIn reports back — rethrow it.
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return errorState("That code is wrong or has expired. Request a new one.");
    }
    throw error;
  }

  return successState("Signed in.");
}

export async function signInWithPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestHeaders = await headers();
  const limit = hit(
    clientKey(requestHeaders, "login"),
    LIMITS.login.limit,
    LIMITS.login.window,
  );
  if (!limit.ok) {
    return errorState(
      `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    );
  }

  const parsed = loginPasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return errorState(
      "Check your email and password.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const callbackUrl = String(formData.get("callbackUrl") || "");

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl || "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return errorState("Those credentials don't match an account.");
    }
    throw error;
  }

  return successState("Signed in.");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/** Lets any signed-in user set or replace their own password. */
export async function setOwnPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return errorState("You must sign in first.");

  const parsed = setPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return errorState(
      "Check the password fields.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  return successState("Password updated. You can now sign in with it.");
}

/** Sends a signed-in visitor to the dashboard their role belongs to. */
export async function goHome(): Promise<never> {
  const user = await getSessionUser();
  redirect(homeFor(user?.role ?? null));
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
