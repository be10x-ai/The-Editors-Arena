import { env, integrationStatus } from "@/lib/env";
import { sendGmail } from "@/lib/google/gmail";
import type { EmailContent } from "@/lib/email/templates";

export type SendResult =
  | { ok: true; messageId: string; skipped?: false }
  | { ok: true; messageId: null; skipped: true; reason: string }
  | { ok: false; messageId: null; error: string };

/**
 * The single send path for the whole app.
 *
 * Never throws: a failed email must not roll back a registration or a status
 * change. Callers persist the returned result (see EmailReminder) and the admin
 * can retry from the dashboard.
 */
export async function sendMail(to: string, content: EmailContent): Promise<SendResult> {
  const status = integrationStatus();

  if (!status.gmail) {
    const reason = env.dryRun
      ? "INTEGRATIONS_DRY_RUN=true"
      : "Gmail credentials not configured";
    console.info(
      `[email:dry-run] → ${to} | ${content.subject} | (${reason})\n${content.text.slice(0, 400)}`,
    );
    return { ok: true, messageId: null, skipped: true, reason };
  }

  try {
    const messageId = await sendGmail({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    return { ok: true, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[email] failed → ${to} | ${content.subject}`, message);
    return { ok: false, messageId: null, error: message };
  }
}

/** Sends to many recipients with a small delay, to stay inside Gmail's rate limits. */
export async function sendMailBatch(
  messages: { to: string; content: EmailContent }[],
  delayMs = 120,
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const message of messages) {
    const result = await sendMail(message.to, message.content);
    if (!result.ok) failed += 1;
    else if (result.skipped) skipped += 1;
    else sent += 1;

    if (delayMs > 0 && messages.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed, skipped };
}
