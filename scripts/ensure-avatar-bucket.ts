/**
 * Creates the Supabase Storage bucket that profile photos live in.
 *
 *   npm run storage:setup
 *
 * This was a manual step buried in a comment, so it was missed and uploads
 * failed with "Bucket not found" only once a contestant tried one. Idempotent,
 * so it is safe to run on every environment and safe to re-run.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The service
 * role bypasses row-level security, so this is a local/CI operator task — never
 * something the app performs at runtime.
 */

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { ALLOWED_AVATAR_TYPES, AVATAR_BUCKET, MAX_AVATAR_BYTES } from "@/lib/storage";

async function main() {
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    console.error(
      "\n  FAIL  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.\n" +
        "        Supabase → Settings → API. Use the service_role key, not anon.\n",
    );
    process.exit(1);
  }

  const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: before, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error(`\n  FAIL  Could not list buckets: ${listError.message}\n`);
    process.exit(1);
  }

  console.log(
    `\n  existing buckets: ${
      before?.map((b) => `${b.name}${b.public ? " (public)" : " (private)"}`).join(", ") ||
      "none"
    }`,
  );

  const found = before?.find((b) => b.name === AVATAR_BUCKET);
  if (found) {
    // A private bucket would break avatarPublicUrl(), which builds a plain
    // public URL — images would 400 rather than fail loudly at upload.
    if (!found.public) {
      console.error(
        `\n  FAIL  "${AVATAR_BUCKET}" exists but is private. Make it public in\n` +
          `        Supabase → Storage → ${AVATAR_BUCKET} → Settings, or photos will not load.\n`,
      );
      process.exit(1);
    }
    console.log(`  ✓ "${AVATAR_BUCKET}" already exists and is public — nothing to do.\n`);
    return;
  }

  const { error } = await supabase.storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: MAX_AVATAR_BYTES,
    allowedMimeTypes: [...ALLOWED_AVATAR_TYPES],
  });
  if (error) {
    console.error(`\n  FAIL  Could not create the bucket: ${error.message}\n`);
    process.exit(1);
  }

  console.log(
    `  ✓ created "${AVATAR_BUCKET}" — public, max ${Math.round(
      MAX_AVATAR_BYTES / 1024 / 1024,
    )} MB, ${ALLOWED_AVATAR_TYPES.join(", ")}\n`,
  );
}

main().catch((error) => {
  console.error(`\n  FAIL  ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
