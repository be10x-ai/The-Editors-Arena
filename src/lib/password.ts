import bcrypt from "bcryptjs";

/**
 * Kept after the move to Supabase Auth, which now owns credentials.
 *
 * The `users.passwordHash` column is still written so the rows stay
 * self-contained: a future move off Supabase Auth is then a migration rather
 * than a forced password reset for every entrant and judge. Nothing verifies
 * against it any more.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
