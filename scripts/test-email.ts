/**
 * Proves the SMTP relay works, end to end, without registering a contestant.
 *
 *   npm run email:test                  → sends to SMTP_USER (safest first run)
 *   npm run email:test you@example.com  → sends to someone else
 *
 * Runs the real transport and a real template, so a pass here means the app's
 * mail path is genuinely live — not that the config merely looks plausible.
 */

import { env, hasSmtp, integrationStatus } from "@/lib/env";
import { sendMail } from "@/lib/email/send";
import { otpEmail } from "@/lib/email/templates";

function fail(message: string, hint?: string): never {
  console.error(`\n  FAIL  ${message}`);
  if (hint) console.error(`        ${hint}`);
  process.exit(1);
}

async function main() {
  const to = process.argv[2]?.trim() || env.smtp.user;

  console.log(`\n  host    ${env.smtp.host || "(unset)"}:${env.smtp.port}`);
  console.log(`  user    ${env.smtp.user || "(unset)"}`);
  console.log(`  from    ${env.mail.senderName} <${env.mail.senderEmail || "(unset)"}>`);
  console.log(`  to      ${to || "(unset)"}`);
  console.log(`  dryRun  ${env.dryRun}`);

  if (!hasSmtp()) {
    fail(
      "SMTP is not fully configured.",
      "Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM_EMAIL in .env",
    );
  }
  if (env.smtp.user.startsWith("REPLACE_ME")) {
    fail("SMTP_USER is still the placeholder.", "Put the mailbox address in .env");
  }
  if (env.smtp.password.startsWith("REPLACE_ME")) {
    fail(
      "SMTP_PASSWORD is still the placeholder.",
      "Copy the mailbox password from your provider's control panel.",
    );
  }
  if (env.smtp.port === 465 && !env.smtp.secure) {
    fail(
      'Port 465 needs SMTP_SECURE="true".',
      "465 is implicit TLS; the handshake stalls without it. Use 587 for STARTTLS.",
    );
  }
  if (!to) fail("No recipient.", "Pass one as an argument, or set SMTP_USER.");

  // sendMail swallows send failures by design, so a dry run would report a
  // misleading success here. Catch it before we claim anything.
  if (!integrationStatus().email) {
    fail(
      "Email is disabled, so nothing would be sent.",
      'Set INTEGRATIONS_DRY_RUN="false" in .env',
    );
  }

  // Verify credentials first: a clean auth error is far easier to read than a
  // send that fails halfway through.
  const { verifySmtp } = await import("@/lib/email/smtp");
  const check = await verifySmtp();
  if (!check.ok) {
    fail(
      `The relay rejected the credentials: ${check.error}`,
      "Check SMTP_USER is the full address, and that SMTP_PASSWORD is the " +
        "mailbox password from the host's control panel.",
    );
  }
  console.log("\n  ✓ credentials accepted");

  const result = await sendMail(to, otpEmail({ code: "123456", ttlMinutes: 10 }));

  if (!result.ok) fail(`Send failed: ${result.error}`);
  if (result.skipped) fail(`Nothing sent — skipped because ${result.reason}.`);

  console.log(`  ✓ sent — message id ${result.messageId}`);
  console.log(`\n  Check ${to}. If it is not there, look in spam.\n`);
  process.exit(0);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
