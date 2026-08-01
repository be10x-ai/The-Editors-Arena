import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/lib/auth.config";
import { consumeOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const codeSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
});

/** Everything both providers need to decide on, and to build a session from. */
const SIGN_IN_INCLUDE = {
  contestant: { select: { id: true, contestantId: true } },
  judge: { select: { id: true, isActive: true } },
} as const;

type SignInUser = Prisma.UserGetPayload<{ include: typeof SIGN_IN_INCLUDE }> | null;

/** Shared so both providers mint byte-identical sessions. */
function toSessionUser(user: NonNullable<SignInUser>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    contestantRowId: user.contestant?.id ?? null,
    contestantId: user.contestant?.contestantId ?? null,
    judgeId: user.judge?.id ?? null,
  };
}

/** Blocks deactivated accounts and stood-down judges, whichever path they used. */
function canSignIn(user: SignInUser): user is NonNullable<SignInUser> {
  if (!user || !user.isActive) return false;
  if (user.role === "JUDGE" && user.judge && !user.judge.isActive) return false;
  return true;
}

/**
 * Two ways in, deliberately ranked.
 *
 * `credentials` (email + password) is primary and has no external dependency,
 * so a dead mail relay can never lock anyone out — the reason an earlier
 * OTP-only sign-in was removed. `otp` exists only as a fallback for people who
 * forgot their password, since `setOwnPassword` needs a live session and there
 * is otherwise no way back into an account.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const { password } = parsed.data;
        if (!password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: SIGN_IN_INCLUDE,
        });

        // Constant-ish work whether or not the account exists, so response
        // timing does not leak which emails are registered.
        if (!user || !user.isActive) {
          await bcrypt.compare(password, DUMMY_HASH);
          return null;
        }

        // Still burn a bcrypt compare when no hash exists, so an account without
        // a password cannot be distinguished by response time.
        if (!user.passwordHash) {
          await bcrypt.compare(password, DUMMY_HASH);
          return null;
        }
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;

        if (!canSignIn(user)) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return toSessionUser(user);
      },
    }),

    Credentials({
      id: "otp",
      name: "one-time code",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "Code", type: "text" },
      },
      async authorize(raw) {
        const parsed = codeSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();

        // Spend the code before looking the account up. consumeOtp is single-use
        // and counts attempts, so checking it first means a guessed code burns
        // an attempt regardless of whether the address exists — no oracle, and
        // no way to grind codes by pointing at an unknown address.
        if (!(await consumeOtp(email, parsed.data.otp))) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: SIGN_IN_INCLUDE,
        });
        if (!canSignIn(user)) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return toSessionUser(user);
      },
    }),
  ],
});

/** bcrypt hash of a value nobody can supply — used to equalise timing. */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
