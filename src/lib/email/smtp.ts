import nodemailer, { type Transporter } from "nodemailer";

import { env } from "@/lib/env";

/**
 * SMTP transport, created once per server instance.
 *
 * Deliberately provider-agnostic: point `SMTP_*` at Resend, Brevo, SES, Postmark
 * or anything else that speaks SMTP. These are the same credentials Supabase's
 * Custom SMTP screen takes — Supabase cannot relay these emails itself, because
 * its mailer only serves Supabase Auth flows and this app authenticates against
 * its own users table.
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

export async function sendSmtp(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<string> {
  const info = await smtpTransport().sendMail({
    from: { name: env.mail.senderName, address: env.mail.senderEmail },
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  return info.messageId;
}

/** Proves the relay accepts our credentials, without sending anything. */
export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  try {
    await smtpTransport().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
