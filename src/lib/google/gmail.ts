import { env } from "@/lib/env";
import { gmailClient } from "@/lib/google/client";

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  cc?: string;
  bcc?: string;
};

/** RFC 2047 encoded-word — keeps non-ASCII subjects intact in every client. */
function encodeHeader(value: string): string {
  return /^[\x20-\x7E]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function buildMimeMessage(input: MailInput): string {
  const boundary = `arena_${Buffer.from(`${input.to}:${input.subject}`)
    .toString("base64url")
    .slice(0, 24)}`;

  const from = `${encodeHeader(env.mail.senderName)} <${env.mail.senderEmail}>`;

  const headers = [
    `From: ${from}`,
    `To: ${input.to}`,
    input.cc ? `Cc: ${input.cc}` : null,
    input.bcc ? `Bcc: ${input.bcc}` : null,
    `Reply-To: ${input.replyTo ?? env.mail.senderEmail}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
    .filter(Boolean)
    .join("\r\n");

  const body = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(input.text, "utf8").toString("base64"),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(input.html, "utf8").toString("base64"),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return `${headers}\r\n\r\n${body}`;
}

/** Sends through the Gmail API. Returns the provider message id. */
export async function sendGmail(input: MailInput): Promise<string> {
  const gmail = gmailClient();
  const raw = Buffer.from(buildMimeMessage(input), "utf8").toString("base64url");

  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return data.id ?? "";
}
