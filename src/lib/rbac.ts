import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  contestantRowId?: string | null;
  contestantId?: string | null;
  judgeId?: string | null;
};

export class AuthorizationError extends Error {
  constructor(message = "You are not allowed to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * The signed-in user, or null.
 *
 * Identity comes from Supabase Auth; role and event linkage come from our own
 * `users` row, matched on email. Email is the login identifier and is unique on
 * both sides, so no extra join column is needed — and the app deliberately
 * forbids self-service email changes, which is what keeps the two in step.
 *
 * `getUser()` rather than `getSession()`: the latter trusts whatever cookie
 * arrived, which a client can forge. `getUser()` verifies it with the auth
 * server.
 *
 * Cached per request, because a page and its actions may ask several times and
 * this is now a database round trip rather than a JWT read.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await supabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const email = authUser?.email?.toLowerCase().trim();
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      contestant: { select: { id: true, contestantId: true } },
      judge: { select: { id: true, isActive: true } },
    },
  });

  // Authenticated with Supabase but no application record, or deactivated:
  // treat as signed out rather than half-signed-in with no role.
  if (!user || !user.isActive) return null;
  if (user.role === "JUDGE" && user.judge && !user.judge.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    contestantRowId: user.contestant?.id ?? null,
    contestantId: user.contestant?.contestantId ?? null,
    judgeId: user.judge?.id ?? null,
  };
});

/**
 * Page-level guard: redirects to login (or the caller's own dashboard when the
 * role is wrong) instead of throwing, so navigation never dead-ends.
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(homeFor(null))}`);
  if (roles.length && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/**
 * Action/route-level guard: throws, because a server action must fail loudly
 * rather than silently 302 into HTML the client cannot parse.
 */
export async function assertRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthorizationError("You must sign in first.");
  if (roles.length && !roles.includes(user.role)) {
    throw new AuthorizationError("Your role cannot perform this action.");
  }
  return user;
}

export const requireAdmin = () => requireRole("ADMIN");
export const requireJudge = () => requireRole("JUDGE", "ADMIN");
export const requireContestant = () => requireRole("CONTESTANT");

export const assertAdmin = () => assertRole("ADMIN");
export const assertJudge = () => assertRole("JUDGE", "ADMIN");
export const assertContestant = () => assertRole("CONTESTANT");

export function homeFor(role: Role | null): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "JUDGE":
      return "/judge";
    case "CONTESTANT":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}
