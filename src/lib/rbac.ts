import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

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

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
    contestantRowId: session.user.contestantRowId ?? null,
    contestantId: session.user.contestantId ?? null,
    judgeId: session.user.judgeId ?? null,
  };
}

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
