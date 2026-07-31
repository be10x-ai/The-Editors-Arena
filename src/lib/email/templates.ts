import type { Hackathon } from "@prisma/client";

import { BRAND } from "@/lib/constants";
import { env } from "@/lib/env";
import { formatIST, formatScore } from "@/lib/utils";

export type EmailContent = { subject: string; html: string; text: string };

const COLORS = {
  bg: "#0a0a09",
  card: "#171613",
  border: "#2c2a25",
  text: "#eeece6",
  muted: "#a8a49a",
  accent: "#f0b213",
  accent2: "#c8910f",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:10px;background:linear-gradient(90deg,${COLORS.accent},${COLORS.accent2});">
      <a href="${href}" style="display:inline-block;padding:13px 26px;font:600 15px/1 -apple-system,Segoe UI,Roboto,sans-serif;color:#0b0b12;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

function layout(opts: { heading: string; preheader: string; body: string }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
  <span style="display:none;font-size:0;line-height:0;color:${COLORS.bg};">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0;font:700 13px/1.2 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:${COLORS.accent};">${escapeHtml(BRAND.name)}</p>
          <h1 style="margin:12px 0 0;font:700 26px/1.25 -apple-system,Segoe UI,Roboto,sans-serif;color:${COLORS.text};">${escapeHtml(opts.heading)}</h1>
        </td></tr>
        <tr><td style="padding:8px 32px 32px;font:400 15px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:${COLORS.text};">
          ${opts.body}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid ${COLORS.border};font:400 12px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:${COLORS.muted};">
          ${escapeHtml(BRAND.name)} · ${escapeHtml(BRAND.organiser)}<br>
          Questions? Reply to this email or write to ${escapeHtml(env.mail.senderEmail || BRAND.supportEmail)}.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function idBadge(contestantId: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">
    <tr><td style="padding:16px 18px;background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.35);border-radius:12px;">
      <p style="margin:0 0 6px;font:600 11px/1 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${COLORS.muted};">Your Contestant ID</p>
      <p style="margin:0;font:700 24px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:${COLORS.text};letter-spacing:.06em;">${escapeHtml(contestantId)}</p>
    </td></tr></table>`;
}

function detailRows(rows: [string, string][]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 20px;border-collapse:collapse;">
    ${rows
      .map(
        ([label, value]) => `<tr>
      <td style="padding:9px 0;border-bottom:1px solid ${COLORS.border};font:400 14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:${COLORS.muted};width:45%;">${escapeHtml(label)}</td>
      <td style="padding:9px 0;border-bottom:1px solid ${COLORS.border};font:600 14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:${COLORS.text};">${escapeHtml(value)}</td>
    </tr>`,
      )
      .join("")}
  </table>`;
}

const dashboardUrl = () => `${env.appUrl}/dashboard`;
const loginUrl = () => `${env.appUrl}/login`;

function eventDetails(hackathon: Hackathon): [string, string][] {
  return [
    ["Hackathon day", formatIST(hackathon.startsAt)],
    ["Submission deadline", formatIST(hackathon.submissionDeadline)],
    ["Results", formatIST(hackathon.resultsAt)],
    ["Format", "Online · India-wide · Individual"],
  ];
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function registrationEmail(args: {
  name: string;
  contestantId: string;
  hackathon: Hackathon;
}): EmailContent {
  const firstName = args.name.split(" ")[0] ?? args.name;
  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">You're registered for <strong>${escapeHtml(args.hackathon.name)}</strong> — India's video editing challenge to discover the next generation of editors. Keep the ID below safe; every file you submit and every scorecard you receive is tied to it.</p>
    ${idBadge(args.contestantId)}
    ${detailRows(eventDetails(args.hackathon))}
    <p style="margin:0 0 8px;font-weight:600;">What happens next</p>
    <ol style="margin:0 0 16px;padding-left:20px;color:${COLORS.text};">
      <li style="margin-bottom:6px;">Sign in to your dashboard with this email — request a one-time code, no password needed.</li>
      <li style="margin-bottom:6px;">We'll email you reminders at 3 days, 2 days, 1 day and 1 hour before the start.</li>
      <li style="margin-bottom:6px;">When the hackathon begins, the task files unlock on your dashboard. The ZIP password is announced at the same moment — not before.</li>
      <li style="margin-bottom:6px;">Edit, then upload your final video (MP4 or MOV) through the portal before the deadline.</li>
    </ol>
    ${button(dashboardUrl(), "Open my dashboard")}
    <p style="margin:0;color:${COLORS.muted};font-size:13px;">Set your machine up in advance: free disk space, a working export preset, and a stable connection for the upload. There are no deadline extensions.</p>`;

  const text = `Hi ${firstName},

You're registered for ${args.hackathon.name}.

Your Contestant ID: ${args.contestantId}

Hackathon day: ${formatIST(args.hackathon.startsAt)}
Submission deadline: ${formatIST(args.hackathon.submissionDeadline)}
Results: ${formatIST(args.hackathon.resultsAt)}

What happens next
1. Sign in at ${loginUrl()} using this email — request a one-time code.
2. Reminders arrive 3 days, 2 days, 1 day and 1 hour before the start.
3. Task files unlock on your dashboard when the hackathon begins; the ZIP password is announced at the same moment.
4. Upload your final video (MP4 or MOV) through the portal before the deadline.

Dashboard: ${dashboardUrl()}

— ${BRAND.name}, ${BRAND.organiser}`;

  return {
    subject: `Welcome to ${BRAND.name}`,
    html: layout({
      heading: `You're in, ${firstName}`,
      preheader: `Your Contestant ID is ${args.contestantId}`,
      body,
    }),
    text,
  };
}

export function threeDaysEmail(args: {
  name: string;
  contestantId: string;
  hackathon: Hackathon;
}): EmailContent {
  const firstName = args.name.split(" ")[0] ?? args.name;
  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">Your hackathon is coming soon — <strong>${formatIST(args.hackathon.startsAt)}</strong>. Three days out, this is the moment to clear the decks.</p>
    <ul style="margin:0 0 16px;padding-left:20px;">
      <li style="margin-bottom:6px;">Block the full window in your calendar. No partial attendance.</li>
      <li style="margin-bottom:6px;">Free up at least 40 GB of disk space for footage and renders.</li>
      <li style="margin-bottom:6px;">Update your editing software now, not on the day.</li>
    </ul>
    ${detailRows([
      ["Contestant ID", args.contestantId],
      ["Starts", formatIST(args.hackathon.startsAt)],
    ])}
    ${button(dashboardUrl(), "Check my dashboard")}`;

  return {
    subject: "Your hackathon is coming soon",
    html: layout({
      heading: "3 days to go",
      preheader: `${BRAND.name} starts ${formatIST(args.hackathon.startsAt)}`,
      body,
    }),
    text: `Hi ${firstName},\n\nYour hackathon is coming soon — ${formatIST(args.hackathon.startsAt)}.\n\nBlock the window, free up 40 GB of disk space, and update your editing software now.\n\nContestant ID: ${args.contestantId}\nDashboard: ${dashboardUrl()}\n\n— ${BRAND.name}`,
  };
}

export function twoDaysEmail(args: {
  name: string;
  contestantId: string;
  hackathon: Hackathon;
}): EmailContent {
  const firstName = args.name.split(" ")[0] ?? args.name;
  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">Prepare your setup. Two days from now you'll be editing against a clock, and every minute spent fixing your machine is a minute off your edit.</p>
    <p style="margin:0 0 8px;font-weight:600;">Tech check</p>
    <ul style="margin:0 0 16px;padding-left:20px;">
      <li style="margin-bottom:6px;">Do a test export at 1920×1080, H.264 — confirm the preset works end to end.</li>
      <li style="margin-bottom:6px;">Test your upload speed. You'll be pushing a large file to the portal.</li>
      <li style="margin-bottom:6px;">Have your fonts, music licences and any AI tool logins ready.</li>
      <li style="margin-bottom:6px;">Sign in to your dashboard once, now, so login isn't a surprise on the day.</li>
    </ul>
    ${detailRows([
      ["Contestant ID", args.contestantId],
      ["Starts", formatIST(args.hackathon.startsAt)],
      ["Accepted formats", "MP4, MOV"],
    ])}
    ${button(dashboardUrl(), "Test my login")}`;

  return {
    subject: "Prepare your setup",
    html: layout({
      heading: "2 days to go",
      preheader: "Test export, test upload, test login.",
      body,
    }),
    text: `Hi ${firstName},\n\nPrepare your setup. Two days to go.\n\n- Test export at 1920x1080 H.264\n- Test your upload speed\n- Fonts, music licences, AI logins ready\n- Sign in to your dashboard once, now: ${loginUrl()}\n\nContestant ID: ${args.contestantId}\nStarts: ${formatIST(args.hackathon.startsAt)}\n\n— ${BRAND.name}`,
  };
}

export function oneDayEmail(args: {
  name: string;
  contestantId: string;
  hackathon: Hackathon;
}): EmailContent {
  const firstName = args.name.split(" ")[0] ?? args.name;
  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">Final reminder — you're editing tomorrow.</p>
    ${detailRows([
      ["Contestant ID", args.contestantId],
      ["Starts", formatIST(args.hackathon.startsAt)],
      ["Submission deadline", formatIST(args.hackathon.submissionDeadline)],
      ["Task files", "Unlock on your dashboard at start time"],
      ["ZIP password", "Announced on your dashboard at start time"],
    ])}
    <p style="margin:0 0 14px;">Everything runs through your dashboard: the download, the password, the timer and the upload. Nothing arrives by DM, and nothing unlocks early.</p>
    ${button(dashboardUrl(), "Open my dashboard")}
    <p style="margin:0;color:${COLORS.muted};font-size:13px;">Sleep. Editing tired is worse than editing fast.</p>`;

  return {
    subject: "Final reminder",
    html: layout({
      heading: "Tomorrow's the day",
      preheader: `Starts ${formatIST(args.hackathon.startsAt)}`,
      body,
    }),
    text: `Hi ${firstName},\n\nFinal reminder — you're editing tomorrow.\n\nContestant ID: ${args.contestantId}\nStarts: ${formatIST(args.hackathon.startsAt)}\nDeadline: ${formatIST(args.hackathon.submissionDeadline)}\n\nTask files and the ZIP password unlock on your dashboard at start time: ${dashboardUrl()}\n\n— ${BRAND.name}`,
  };
}

export function oneHourEmail(args: {
  name: string;
  contestantId: string;
  hackathon: Hackathon;
}): EmailContent {
  const firstName = args.name.split(" ")[0] ?? args.name;
  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;"><strong>The hackathon starts in one hour.</strong> Open your dashboard and keep it open — the task files and ZIP password appear there the moment we go live.</p>
    ${detailRows([
      ["Contestant ID", args.contestantId],
      ["Starts", formatIST(args.hackathon.startsAt)],
      ["Deadline", formatIST(args.hackathon.submissionDeadline)],
    ])}
    ${button(dashboardUrl(), "Go to dashboard")}`;

  return {
    subject: "Hackathon starts in 1 hour",
    html: layout({
      heading: "One hour to go",
      preheader: "Open your dashboard and keep it open.",
      body,
    }),
    text: `Hi ${firstName},\n\nThe hackathon starts in one hour. Open your dashboard and keep it open — task files and the ZIP password appear there at start time.\n\nContestant ID: ${args.contestantId}\nDashboard: ${dashboardUrl()}\n\n— ${BRAND.name}`,
  };
}

export function assetsReleasedEmail(args: {
  name: string;
  contestantId: string;
  hackathon: Hackathon;
}): EmailContent {
  const firstName = args.name.split(" ")[0] ?? args.name;
  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">The task files are live. Download <strong>${escapeHtml(args.hackathon.assetZipName)}</strong> from your dashboard — the ZIP password is displayed on the same page.</p>
    ${detailRows([
      ["Contestant ID", args.contestantId],
      ["Deadline", formatIST(args.hackathon.submissionDeadline)],
    ])}
    ${button(dashboardUrl(), "Download task files")}
    <p style="margin:0;color:${COLORS.muted};font-size:13px;">We never send the password by email. It only ever appears on your dashboard.</p>`;

  return {
    subject: "Task files are live — download now",
    html: layout({
      heading: "Your assets are ready",
      preheader: "Download the task ZIP from your dashboard.",
      body,
    }),
    text: `Hi ${firstName},\n\nThe task files are live. Download ${args.hackathon.assetZipName} from your dashboard; the ZIP password is shown on the same page.\n\nDeadline: ${formatIST(args.hackathon.submissionDeadline)}\nDashboard: ${dashboardUrl()}\n\n— ${BRAND.name}`,
  };
}

export function submissionReceivedEmail(args: {
  name: string;
  contestantId: string;
  fileName: string;
  uploadedAt: Date;
  isLate: boolean;
}): EmailContent {
  const firstName = args.name.split(" ")[0] ?? args.name;
  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">Your submission is in${args.isLate ? " — flagged as a late entry" : ""}. Nothing further is needed from you.</p>
    ${detailRows([
      ["Contestant ID", args.contestantId],
      ["File", args.fileName],
      ["Received", formatIST(args.uploadedAt)],
      ["Status", args.isLate ? "Submitted (late)" : "Submitted"],
    ])}
    <p style="margin:0 0 14px;">Judging happens next. You'll receive your individual scorecard when results are announced — every participant gets one, not just the winners.</p>
    ${button(dashboardUrl(), "View my submission")}`;

  return {
    subject: "Submission received",
    html: layout({
      heading: "Submission received",
      preheader: `${args.fileName} is safely uploaded.`,
      body,
    }),
    text: `Hi ${firstName},\n\nYour submission is in${args.isLate ? " (flagged late)" : ""}.\n\nContestant ID: ${args.contestantId}\nFile: ${args.fileName}\nReceived: ${formatIST(args.uploadedAt)}\n\nYou'll get your individual scorecard when results are announced.\n\n— ${BRAND.name}`,
  };
}

export function resultsEmail(args: {
  name: string;
  contestantId: string;
  rank: number | null;
  finalScore: number | null;
  totalRanked: number;
  isWinner: boolean;
  isRunnerUp: boolean;
}): EmailContent {
  const firstName = args.name.split(" ")[0] ?? args.name;
  const headline = args.isWinner
    ? "You won The Editor Arena"
    : args.isRunnerUp
      ? "You're a runner-up"
      : "Your results are in";

  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">${
      args.isWinner
        ? "You took first place. Our team will be in touch within 72 hours about your prize and the hiring conversation."
        : args.isRunnerUp
          ? "You finished on the podium. Our team will be in touch about your prize and next steps."
          : "Thank you for competing. Here's exactly how you scored."
    }</p>
    ${detailRows([
      ["Contestant ID", args.contestantId],
      ["Final score", `${formatScore(args.finalScore)} / 10`],
      ["Rank", args.rank ? `${args.rank} of ${args.totalRanked}` : "Not ranked"],
    ])}
    ${button(`${env.appUrl}/leaderboard`, "View the leaderboard")}
    <p style="margin:0;color:${COLORS.muted};font-size:13px;">Your full scorecard, including each judge's written feedback, is on your dashboard.</p>`;

  return {
    subject: args.isWinner ? "You won The Editor Arena" : "Your Editor Arena results",
    html: layout({
      heading: headline,
      preheader: `Final score ${formatScore(args.finalScore)} / 10`,
      body,
    }),
    text: `Hi ${firstName},\n\n${headline}.\n\nContestant ID: ${args.contestantId}\nFinal score: ${formatScore(args.finalScore)} / 10\nRank: ${args.rank ? `${args.rank} of ${args.totalRanked}` : "Not ranked"}\n\nLeaderboard: ${env.appUrl}/leaderboard\nYour full scorecard is on your dashboard: ${dashboardUrl()}\n\n— ${BRAND.name}`,
  };
}

export function otpEmail(args: { code: string; ttlMinutes: number }): EmailContent {
  const body = `
    <p style="margin:0 0 14px;">Use this code to sign in. It expires in ${args.ttlMinutes} minutes and works once.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr><td style="padding:18px 28px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.35);border-radius:12px;font:700 32px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.28em;color:${COLORS.text};">${escapeHtml(args.code)}</td></tr>
    </table>
    <p style="margin:0;color:${COLORS.muted};font-size:13px;">Didn't request this? Ignore this email — nobody can sign in without the code.</p>`;

  return {
    subject: `Your sign-in code: ${args.code}`,
    html: layout({
      heading: "Your sign-in code",
      preheader: `Code ${args.code} — expires in ${args.ttlMinutes} minutes.`,
      body,
    }),
    text: `Your ${BRAND.name} sign-in code is ${args.code}.\n\nIt expires in ${args.ttlMinutes} minutes and works once.\n\nDidn't request it? Ignore this email.`,
  };
}

export function judgeInviteEmail(args: {
  name: string;
  email: string;
  password: string;
  hackathon: Hackathon;
}): EmailContent {
  const firstName = args.name.split(" ")[0] ?? args.name;
  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">You're on the jury for <strong>${escapeHtml(args.hackathon.name)}</strong>. Your judge account is ready.</p>
    ${detailRows([
      ["Portal", `${env.appUrl}/judge`],
      ["Email", args.email],
      ["Temporary password", args.password],
      [
        "Judging window",
        `${formatIST(args.hackathon.submissionDeadline)} → ${formatIST(args.hackathon.judgingEndsAt)}`,
      ],
    ])}
    <p style="margin:0 0 14px;">Change your password after your first sign-in. You'll score six criteria from 0.0 to 10.0 plus a holistic overall score, and leave one written comment per submission — those comments become the participant scorecards, so please make them specific.</p>
    <p style="margin:0 0 14px;"><strong>Scores lock when you submit them.</strong> Save a draft as often as you like; finalise only when you're sure.</p>
    ${button(`${env.appUrl}/judge`, "Open the judge portal")}`;

  return {
    subject: `You're judging ${args.hackathon.name}`,
    html: layout({
      heading: "Your judge access",
      preheader: "Portal link and temporary password inside.",
      body,
    }),
    text: `Hi ${firstName},\n\nYou're on the jury for ${args.hackathon.name}.\n\nPortal: ${env.appUrl}/judge\nEmail: ${args.email}\nTemporary password: ${args.password}\n\nChange your password after first sign-in. Scores lock when you submit them — save drafts freely, finalise once.\n\n— ${BRAND.name}`,
  };
}
