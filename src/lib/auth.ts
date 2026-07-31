import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/lib/auth.config";
import { consumeOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).optional(),
  otp: z.string().min(4).max(10).optional(),
});

/**
 * A single credentials provider serving both login modes:
 *   • password — admins, judges, and contestants who set one
 *   • otp      — contestants who prefer the emailed six-digit code
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "One-time code", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const { password, otp } = parsed.data;
        if (!password && !otp) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            contestant: { select: { id: true, contestantId: true } },
            judge: { select: { id: true, isActive: true } },
          },
        });

        // Constant-ish work whether or not the account exists, so response
        // timing does not leak which emails are registered.
        if (!user || !user.isActive) {
          if (password) await bcrypt.compare(password, DUMMY_HASH);
          return null;
        }

        if (otp) {
          const ok = await consumeOtp(email, otp);
          if (!ok) return null;
        } else if (password) {
          if (!user.passwordHash) return null;
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;
        }

        if (user.role === "JUDGE" && user.judge && !user.judge.isActive) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          contestantRowId: user.contestant?.id ?? null,
          contestantId: user.contestant?.contestantId ?? null,
          judgeId: user.judge?.id ?? null,
        };
      },
    }),
  ],
});

/** bcrypt hash of a value nobody can supply — used to equalise timing. */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
