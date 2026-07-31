"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hashPassword, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, hit, LIMITS } from "@/lib/rate-limit";
import { getSessionUser, homeFor } from "@/lib/rbac";
import { loginPasswordSchema, setPasswordSchema } from "@/lib/validations";
import { errorState, successState, type ActionState } from "@/server/actions/types";

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
