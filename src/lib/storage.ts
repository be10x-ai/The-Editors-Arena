import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/** Public bucket holding contestant avatars. Create it once in Supabase Storage. */
export const AVATAR_BUCKET = "avatars";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client, used only on the server.
 *
 * The service role bypasses row-level security, so this must never reach the
 * browser — it is imported exclusively from server actions. Uploads go through
 * here rather than direct-from-browser so the file is size- and type-checked by
 * code the user cannot edit.
 */
function storageClient(): SupabaseClient {
  if (!cached) {
    cached = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export function hasStorage(): boolean {
  return Boolean(env.supabase.url && env.supabase.serviceRoleKey);
}

export async function uploadAvatar(
  path: string,
  file: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const { error } = await storageClient()
    .storage.from(AVATAR_BUCKET)
    .upload(path, file, { contentType, upsert: true });
  if (error) throw new Error(error.message);
}

export async function removeAvatar(path: string): Promise<void> {
  // A failed delete must not block the profile update — a stray object costs a
  // few kilobytes, a thrown error costs the user their change.
  await storageClient()
    .storage.from(AVATAR_BUCKET)
    .remove([path])
    .catch(() => undefined);
}

/** Derived at render time, so moving bucket or CDN never rewrites stored rows. */
export function avatarPublicUrl(path: string | null | undefined): string | null {
  if (!path || !env.supabase.url) return null;
  return `${env.supabase.url}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}
