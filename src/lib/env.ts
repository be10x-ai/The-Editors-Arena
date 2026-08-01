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

  /**
   * Supabase, used only for Storage — the database goes through Prisma and auth
   * is this app's own. The service-role key bypasses row-level security, so it
   * must never be exposed to the browser.
   */
  supabase: {
    url: str("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: str("SUPABASE_SERVICE_ROLE_KEY"),
  },

  /**
   * Outbound mail over plain SMTP, straight from this app to the relay.
   *
   * These are the same credentials Supabase's Custom SMTP screen takes, but the
   * two are independent senders on one mailbox, not a chain: Supabase relays
   * only its own Auth templates, and this app does not use Supabase Auth.
   */
  smtp: {
    host: str("SMTP_HOST"),
    port: Number(str("SMTP_PORT", "587")),
    user: str("SMTP_USER"),
    password: str("SMTP_PASSWORD"),
    /** Implicit TLS on 465; STARTTLS on 587. */
    secure: bool("SMTP_SECURE", str("SMTP_PORT", "587") === "465"),
  },

  mail: {
    senderEmail: str("MAIL_FROM_EMAIL"),
    senderName: str("MAIL_FROM_NAME", "The Editor's Arena"),
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

/** True when an SMTP relay is configured well enough to send. */
export function hasSmtp(): boolean {
  return Boolean(
    env.smtp.host && env.smtp.user && env.smtp.password && env.mail.senderEmail,
  );
}

/** Reports which integrations are live — surfaced on the admin dashboard. */
export function integrationStatus() {
  return {
    dryRun: env.dryRun,
    email: !env.dryRun && hasSmtp(),
  };
}
