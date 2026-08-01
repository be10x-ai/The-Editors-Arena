import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Service-role client for managing Supabase Auth accounts.
 *
 * Server-only — the service role bypasses row-level security and can act as any
 * user. Accounts here are created by registration and by admins, never by the
 * visitor, which is why `signInWithOtp` is called with `shouldCreateUser: false`
 * elsewhere.
 */
let cached: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (!cached) {
    cached = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export function hasAuthAdmin(): boolean {
  return Boolean(env.supabase.url && env.supabase.serviceRoleKey);
}

async function findByEmail(email: string) {
  // listUsers is paginated and has no email filter; the cohort here is small
  // enough that a bounded scan is honest and cheap.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Makes sure a Supabase Auth account exists for this address.
 *
 * `email_confirm: true` because the account is being created by us, not by a
 * stranger typing an address — the person already proved they hold it by
 * registering, or an admin vouched for them. Leaving it false would lock every
 * judge out until they found a confirmation email.
 *
 * Returns the auth user id, or null when Supabase is not configured, so a
 * missing key degrades to "cannot sign in yet" rather than a failed
 * registration.
 */
export async function ensureAuthUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<string | null> {
  if (!hasAuthAdmin()) return null;

  const email = input.email.toLowerCase().trim();
  const existing = await findByEmail(email);

  if (existing) {
    const { error } = await admin().auth.admin.updateUserById(existing.id, {
      password: input.password,
    });
    if (error) throw new Error(error.message);
    return existing.id;
  }

  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: input.name ? { name: input.name } : undefined,
  });
  if (error) throw new Error(error.message);
  return data.user?.id ?? null;
}

/** Used when an account is deactivated so the credentials stop working. */
export async function deleteAuthUser(email: string): Promise<void> {
  if (!hasAuthAdmin()) return;
  const existing = await findByEmail(email.toLowerCase().trim());
  if (!existing) return;
  await admin().auth.admin.deleteUser(existing.id);
}
