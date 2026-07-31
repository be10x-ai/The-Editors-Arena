import { google } from "googleapis";
import type { drive_v3, gmail_v1, sheets_v4 } from "googleapis";

import { env, hasGmailOAuth, hasServiceAccount } from "@/lib/env";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];
const SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

export class IntegrationNotConfiguredError extends Error {
  constructor(service: string) {
    super(
      `${service} is not configured. Set the Google credentials in .env (see .env.example) or keep INTEGRATIONS_DRY_RUN=true.`,
    );
    this.name = "IntegrationNotConfiguredError";
  }
}

function serviceAccountAuth(scopes: string[], subject?: string) {
  if (!hasServiceAccount())
    throw new IntegrationNotConfiguredError("Google service account");
  return new google.auth.JWT({
    email: env.google.clientEmail,
    key: env.google.privateKey,
    scopes,
    // Domain-wide delegation: required for Gmail "send as" a real mailbox.
    subject,
  });
}

function oauthAuth(scopes: string[]) {
  const client = new google.auth.OAuth2({
    clientId: env.google.oauthClientId,
    clientSecret: env.google.oauthClientSecret,
  });
  client.setCredentials({
    refresh_token: env.google.gmailRefreshToken,
    scope: scopes.join(" "),
  });
  return client;
}

export function driveClient(): drive_v3.Drive {
  return google.drive({ version: "v3", auth: serviceAccountAuth(DRIVE_SCOPES) });
}

export function sheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: serviceAccountAuth(SHEETS_SCOPES) });
}

/**
 * Gmail prefers an OAuth2 refresh token (works with any Google account and needs
 * no Workspace admin), and falls back to service-account impersonation.
 */
export function gmailClient(): gmail_v1.Gmail {
  if (hasGmailOAuth()) {
    return google.gmail({ version: "v1", auth: oauthAuth(GMAIL_SCOPES) });
  }
  if (!env.mail.senderEmail) throw new IntegrationNotConfiguredError("Gmail sender");
  return google.gmail({
    version: "v1",
    auth: serviceAccountAuth(GMAIL_SCOPES, env.mail.senderEmail),
  });
}

/** Raw bearer token — needed for the resumable-upload endpoints we call by hand. */
export async function driveAccessToken(): Promise<string> {
  const auth = serviceAccountAuth(DRIVE_SCOPES);
  const { token } = await auth.getAccessToken();
  if (!token) throw new IntegrationNotConfiguredError("Google Drive access token");
  return token;
}

/** Shared-Drive-aware query params. Harmless on a My Drive folder. */
export const sharedDriveParams = {
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
} as const;

export function driveCorpusParams() {
  return env.google.driveId
    ? { driveId: env.google.driveId, corpora: "drive" as const, ...sharedDriveParams }
    : { ...sharedDriveParams };
}
