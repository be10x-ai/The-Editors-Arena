import nodemailer, { type Transporter } from "nodemailer";

import { env } from "@/lib/env";

/**
 * SMTP transport, created once per server instance.
 *
 * Deliberately provider-agnostic: `SMTP_*` points at whatever relay the mailbox
 * lives on. Supabase's Custom SMTP screen takes these same credentials, but it
 * is a parallel sender, not a hop on the way out — it carries only Supabase
 * Auth's own templates, and this app authenticates against its own users table.
 *
 * Cached because a fresh connection per email is slow and, on a warm serverless
 * instance, wasteful — nodemailer pools and reuses the socket.
 */
let cached: Transporter | null = null;

export function smtpTransport(): Transporter {
  if (cached) return cached;

  cached = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.password },
    pool: true,
    maxConnections: 3,
    // A hung relay must not hold a function open until the platform kills it.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return cached;
}

/**
 * Turns transport failures into something an organiser can act on.
 *
 * These surface verbatim on /admin/emails, and the raw forms are OpenSSL and
 * nodemailer internals — "tls_validate_record_header:wrong version number"
 * gives no hint that the fix is one environment variable.
 */
export function explainSmtpError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const code = String((error as { code?: unknown })?.code ?? "");
  const where = `Currently SMTP_PORT=${env.smtp.port} with SMTP_SECURE=${env.smtp.secure}.`;

  // We spoke TLS; the relay answered in plaintext.
  if (/wrong version number/i.test(raw)) {
    return `TLS mismatch — the relay answered in plaintext but we opened an encrypted connection. Port 465 needs SMTP_SECURE="true"; ports 587 and 25 need "false". ${where}`;
  }
  // We spoke plaintext; the relay answered with TLS.
  if (/packet length too long|record layer|SSL routines.*unknown protocol/i.test(raw)) {
    return `TLS mismatch — the relay expects an encrypted connection from the first byte. Set SMTP_SECURE="true" for port 465. ${where}`;
  }
  if (code === "EAUTH" || /invalid login|authentication fail|\b535\b/i.test(raw)) {
    return "The relay rejected the credentials. Check SMTP_USER is the full mailbox address and SMTP_PASSWORD is that mailbox's password.";
  }
  if (code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ESOCKET") {
    return `Could not reach ${env.smtp.host}:${env.smtp.port}. Check the host and port, and that the provider is not blocking the connection. ${where}`;
  }
  if (code === "EDNS" || /getaddrinfo|ENOTFOUND/i.test(raw)) {
    return `SMTP_HOST does not resolve: "${env.smtp.host}".`;
  }
  if (/self.signed certificate|unable to verify the first certificate/i.test(raw)) {
    return "The relay's TLS certificate could not be verified. Confirm SMTP_HOST matches the name on the certificate.";
  }
  if (/\b(550|553|relay access denied|sender address rejected)\b/i.test(raw)) {
    return `The relay refused the From address "${env.mail.senderEmail}". It usually has to match the authenticated mailbox.`;
  }
  return raw;
}

export async function sendSmtp(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<string> {
  try {
    const info = await smtpTransport().sendMail({
      from: { name: env.mail.senderName, address: env.mail.senderEmail },
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return info.messageId;
  } catch (error) {
    throw new Error(explainSmtpError(error));
  }
}

/** Proves the relay accepts our credentials, without sending anything. */
export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  try {
    await smtpTransport().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: explainSmtpError(error) };
  }
}
