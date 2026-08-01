/**
 * Imports the application's users into Supabase Auth.
 *
 *   npm run auth:migrate          # report only, changes nothing
 *   npm run auth:migrate -- --run # create the missing accounts
 *
 * Existing bcrypt hashes are carried across with `password_hash`, so everyone
 * keeps the password they already have — a migration that forced 8 people to
 * reset days before the event would be worse than the problem it solves.
 *
 * Idempotent: accounts that already exist are reported and left alone.
 * Identity is matched on email, which is unique on both sides and which this
 * app treats as immutable.
 */

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--run");

type AdminCreate = Parameters<
  ReturnType<typeof createClient>["auth"]["admin"]["createUser"]
>[0];

async function main() {
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    console.error("\n  FAIL  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.\n");
    process.exit(1);
  }

  const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { email: true, name: true, role: true, passwordHash: true },
    orderBy: { createdAt: "asc" },
  });

  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    console.error(`\n  FAIL  ${listError.message}\n`);
    process.exit(1);
  }
  const already = new Set(
    existing.users.map((u) => u.email?.toLowerCase()).filter(Boolean) as string[],
  );

  console.log(`\n  application users : ${users.length}`);
  console.log(`  already in auth   : ${already.size}`);
  console.log(APPLY ? "  mode              : APPLYING\n" : "  mode              : dry run (pass --run to apply)\n");

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const email = user.email.toLowerCase();

    if (already.has(email)) {
      console.log(`  =  ${email.padEnd(38)} ${user.role.padEnd(11)} already exists`);
      skipped += 1;
      continue;
    }
    if (!user.passwordHash) {
      // No hash to carry over; creating a passwordless account would leave them
      // unable to sign in and unable to tell why. The emailed-code path is the
      // route in for these.
      console.log(`  !  ${email.padEnd(38)} ${user.role.padEnd(11)} no password hash — skipped`);
      skipped += 1;
      continue;
    }
    if (!APPLY) {
      console.log(`  +  ${email.padEnd(38)} ${user.role.padEnd(11)} would create`);
      created += 1;
      continue;
    }

    const attributes = {
      email,
      password_hash: user.passwordHash,
      email_confirm: true,
      user_metadata: { name: user.name },
    } as unknown as AdminCreate;

    const { error } = await supabase.auth.admin.createUser(attributes);
    if (error) {
      console.log(`  x  ${email.padEnd(38)} ${user.role.padEnd(11)} ${error.message}`);
      failed += 1;
      continue;
    }
    console.log(`  +  ${email.padEnd(38)} ${user.role.padEnd(11)} created`);
    created += 1;
  }

  console.log(
    `\n  ${APPLY ? "created" : "would create"} ${created}, skipped ${skipped}, failed ${failed}\n`,
  );
  if (!APPLY && created > 0) console.log("  Re-run with --run to apply.\n");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(`\n  FAIL  ${error instanceof Error ? error.message : String(error)}\n`);
  await prisma.$disconnect();
  process.exit(1);
});
