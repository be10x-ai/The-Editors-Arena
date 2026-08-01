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

/**
 * Whether to open the SMTP connection already encrypted.
 *
 * On the standard ports this is protocol, not preference: 465 is implicit TLS
 * and 587/25 are STARTTLS, and there is no working combination the other way
 * round. Declaring it wrong fails with `tls_validate_record_header:wrong
 * version number`, which reads like a certificate problem and is not one — so
 * the port decides, and SMTP_SECURE is honoured only on non-standard ports.
 */
function smtpSecure(): boolean {
  const port = Number(str("SMTP_PORT", "587"));
  const raw = process.env.SMTP_SECURE?.trim().toLowerCase();
  const declared = raw ? raw === "true" || raw === "1" || raw === "yes" : null;

  const forced = port === 465 ? true : port === 587 || port === 25 ? false : null;

  if (forced !== null) {
    if (declared !== null && declared !== forced) {
      console.warn(
        `[smtp] SMTP_SECURE="${raw}" is wrong for port ${port} — using ${forced}. ` +
          `465 is implicit TLS; 587 and 25 are STARTTLS.`,
      );
    }
    return forced;
  }

  return declared ?? false;
}

/**
 * The From address on every outgoing email.
 *
 * A relay will not send as a domain it has not authenticated. A stale
 * MAIL_FROM_EMAIL left over from a different provider therefore fails every
 * message with a 550 — not some of them, all of them — while the credentials
 * themselves are perfectly good, which makes it look like a mail outage.
 *
 * A different local part on the same domain is normal and left alone
 * (arena@ sending through the noreply@ mailbox). A different *domain* is not
 * survivable, so the authenticated mailbox wins and the mismatch is logged.
 */
function senderEmail(): string {
  const mailbox = str("SMTP_USER");
  const declared = str("MAIL_FROM_EMAIL");

  if (!declared) return mailbox;
  if (!mailbox) return declared;

  const domain = (address: string) => address.split("@")[1]?.toLowerCase() ?? "";
  if (domain(declared) && domain(mailbox) && domain(declared) !== domain(mailbox)) {
    console.warn(
      `[smtp] MAIL_FROM_EMAIL="${declared}" is on a different domain to ` +
        `SMTP_USER="${mailbox}" — the relay would refuse it, so sending as ` +
        `"${mailbox}" instead. Point MAIL_FROM_EMAIL at the authenticated mailbox.`,
    );
    return mailbox;
  }

  return declared;
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
    /** Safe in the browser; row-level security still applies to it. */
    anonKey: str("NEXT_PUBLIC_SUPABASE_ANON_KEY", str("SUPABASE_ANON_KEY")),
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
    secure: smtpSecure(),
  },

  mail: {
    senderEmail: senderEmail(),
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
