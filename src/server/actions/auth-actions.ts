"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { clientKey, hit, LIMITS } from "@/lib/rate-limit";
import { getSessionUser, homeFor } from "@/lib/rbac";
import { supabaseServer } from "@/lib/supabase/server";
import {
  loginPasswordSchema,
  otpRequestSchema,
  otpVerifySchema,
  setPasswordSchema,
} from "@/lib/validations";
import { errorState, successState, type ActionState } from "@/server/actions/types";

/** Same-origin only — never bounce a session to another host. */
function safeCallback(value: FormDataEntryValue | null): string {
  const raw = String(value ?? "");
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "";
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

  const callbackUrl = safeCallback(formData.get("callbackUrl"));
  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // Deliberately not distinguishing wrong-password from no-such-account: the
  // difference tells an attacker which addresses are registered.
  if (error) return errorState("Those credentials don't match an account.");

  await noteSignIn(parsed.data.email);
  redirect(callbackUrl || (await homeForCurrentUser()));
}

/**
 * Emails a sign-in code — the way back in for someone who has forgotten their
 * password, since setOwnPassword needs a session they cannot get.
 *
 * `shouldCreateUser: false` matters: without it Supabase would happily mint an
 * account for any address typed into the box, and this app's accounts are
 * created by registration and by admins, never by asking for a code.
 *
 * The reply is identical whether or not the address exists, so it cannot be
 * used to test which emails are registered.
 */
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
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error) console.error(`[otp] could not send a code to ${email}: ${error.message}`);

  return successState(
    "If that address has an account, a 6-digit code is on its way. It expires shortly.",
    { email },
  );
}

/** Completes the fallback sign-in. Supabase burns the code on success. */
export async function signInWithCode(
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

  const callbackUrl = safeCallback(formData.get("callbackUrl"));
  const supabase = await supabaseServer();

  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.otp,
    type: "email",
  });
  if (error) return errorState("That code is wrong, already used, or has expired.");

  await noteSignIn(parsed.data.email);
  redirect(callbackUrl || (await homeForCurrentUser()));
}

export async function signOutAction(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
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

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return errorState(error.message);

  return successState("Password updated. You can now sign in with it.");
}

/** Sends a signed-in visitor to the dashboard their role belongs to. */
export async function goHome(): Promise<never> {
  const user = await getSessionUser();
  redirect(homeFor(user?.role ?? null));
}

async function homeForCurrentUser(): Promise<string> {
  const user = await getSessionUser();
  return homeFor(user?.role ?? null);
}

/** Best-effort: a failed timestamp write must not block the sign-in. */
async function noteSignIn(email: string): Promise<void> {
  await prisma.user
    .update({ where: { email }, data: { lastLoginAt: new Date() } })
    .catch(() => undefined);
}
