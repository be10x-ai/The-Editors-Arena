import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  // 6 digits, uniformly distributed, from a CSPRNG.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Issues a login code for `email`, invalidating any earlier unused code.
 * Returns the plaintext code so the caller can email it — it is never stored.
 */
export async function issueOtp(email: string): Promise<string> {
  const normalised = email.toLowerCase().trim();
  const code = generateCode();

  await prisma.$transaction([
    prisma.otpToken.updateMany({
      where: { email: normalised, purpose: "LOGIN", consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.otpToken.create({
      data: {
        email: normalised,
        codeHash: await bcrypt.hash(code, 10),
        purpose: "LOGIN",
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
      },
    }),
  ]);

  return code;
}

/**
 * Verifies and burns a login code. Single-use: a successful check marks the
 * token consumed inside the same call, so a replay always fails.
 */
export async function consumeOtp(email: string, code: string): Promise<boolean> {
  const normalised = email.toLowerCase().trim();

  const token = await prisma.otpToken.findFirst({
    where: {
      email: normalised,
      purpose: "LOGIN",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!token) return false;

  if (token.attempts >= MAX_ATTEMPTS) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });
    return false;
  }

  const ok = await bcrypt.compare(code.trim(), token.codeHash);

  await prisma.otpToken.update({
    where: { id: token.id },
    data: ok
      ? { consumedAt: new Date(), attempts: { increment: 1 } }
      : { attempts: { increment: 1 } },
  });

  return ok;
}

/** Housekeeping for the reminder cron: drop codes nobody can use any more. */
export async function purgeExpiredOtps(): Promise<number> {
  const { count } = await prisma.otpToken.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
  });
  return count;
}

export const OTP_TTL = OTP_TTL_MINUTES;
