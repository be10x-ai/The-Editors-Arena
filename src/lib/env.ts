/**
 * Centralised environment access.
 *
 * Nothing here throws at import time — the app must boot (and the landing page
 * must render) even when Google integrations are not configured yet. Callers
 * that genuinely need a value use `requireEnv`.
 */

function str(key: string, fallback = ""): string {
  return process.env[key]?.trim() || fallback;
}

function bool(key: string, fallback = false): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}

export const env = {
  appUrl: str("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  nodeEnv: str("NODE_ENV", "development"),
  isProd: str("NODE_ENV") === "production",

  authSecret: str("AUTH_SECRET"),
  cronSecret: str("CRON_SECRET"),

  google: {
    clientEmail: str("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    // Vercel stores newlines as literal "\n" — normalise both forms.
    privateKey: str("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n"),
    driveId: str("GOOGLE_DRIVE_ID"),
    submissionsFolderId: str("GOOGLE_DRIVE_SUBMISSIONS_FOLDER_ID"),
    sheetId: str("GOOGLE_SHEET_ID"),
    sheetTab: str("GOOGLE_SHEET_TAB", "Registrations"),
    oauthClientId: str("GOOGLE_OAUTH_CLIENT_ID"),
    oauthClientSecret: str("GOOGLE_OAUTH_CLIENT_SECRET"),
    gmailRefreshToken: str("GMAIL_REFRESH_TOKEN"),
  },

  mail: {
    senderEmail: str("GMAIL_SENDER_EMAIL"),
    senderName: str("GMAIL_SENDER_NAME", "The Editor's Arena"),
  },

  seed: {
    adminEmail: str("SEED_ADMIN_EMAIL", "admin@editorarena.in"),
    adminPassword: str("SEED_ADMIN_PASSWORD", "ChangeThisAdmin#2026"),
    judgePassword: str("SEED_JUDGE_PASSWORD", "ChangeThisJudge#2026"),
    demoData: bool("SEED_DEMO_DATA", false),
  },

  /** When true, Google calls are logged instead of executed. */
  dryRun: bool("INTEGRATIONS_DRY_RUN", false),
} as const;

export function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}. See .env.example.`);
  }
  return value;
}

/** True when the service-account credentials needed by Drive/Sheets exist. */
export function hasServiceAccount(): boolean {
  return Boolean(env.google.clientEmail && env.google.privateKey);
}

export function hasGmailOAuth(): boolean {
  return Boolean(
    env.google.oauthClientId &&
    env.google.oauthClientSecret &&
    env.google.gmailRefreshToken,
  );
}

/** Reports which integrations are live — surfaced on the admin settings page. */
export function integrationStatus() {
  return {
    dryRun: env.dryRun,
    drive:
      !env.dryRun && hasServiceAccount() && Boolean(env.google.submissionsFolderId),
    sheets: !env.dryRun && hasServiceAccount() && Boolean(env.google.sheetId),
    gmail:
      !env.dryRun &&
      Boolean(env.mail.senderEmail) &&
      (hasGmailOAuth() || hasServiceAccount()),
  };
}
