# Deployment Guide — The Editor Arena

Target: Vercel + managed PostgreSQL + a Google Cloud service account.
Everything below also works on any Node 20+ host; only the cron wiring differs.

Budget about 90 minutes for a first-time setup, most of it in Google Cloud.

---

## 0. Order of operations

1. [Database](#1-database)
2. [Google Cloud project + service account](#2-google-cloud-project--service-account)
3. [Google Drive](#3-google-drive)
4. [Google Sheets](#4-google-sheets)
5. [Gmail sending](#5-gmail-sending)
6. [Deploy to Vercel](#6-deploy-to-vercel)
7. [Migrate + seed](#7-migrate--seed)
8. [Cron](#8-cron)
9. [Go-live checklist](#9-go-live-checklist)
10. [Event-day runbook](#10-event-day-runbook)
11. [Troubleshooting](#11-troubleshooting)

Keep `INTEGRATIONS_DRY_RUN=true` until step 5 is done. In dry-run the app runs
normally but logs emails instead of sending them and disables Drive uploads, so a
half-configured deployment can't email 500 people by accident.

---

## 1. Database

Any Postgres 14+ works. Neon and Supabase are the easiest fits for Vercel.

You need **two** URLs because Prisma migrations cannot run through a connection
pooler:

```env
# Pooled — used by the app at runtime
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"
# Direct — used by `prisma migrate`
DIRECT_DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

With a plain self-hosted Postgres, set both to the same value.

Sizing: this workload is tiny (hundreds of rows, dozens of concurrent users). The
smallest paid tier is plenty; the free tier is fine for a first edition, but check
that it does not sleep — a cold database during the upload window is a bad hour.

---

## 2. Google Cloud project + service account

1. Create a project at <https://console.cloud.google.com> (e.g. `editor-arena`).
2. **APIs & Services → Library** — enable all three:
   - Google Drive API
   - Google Sheets API
   - Gmail API
3. **IAM & Admin → Service Accounts → Create**
   - Name: `editor-arena`
   - No project roles are needed (access is granted per-resource by sharing).
4. Open the service account → **Keys → Add key → Create new key → JSON**.
5. From the JSON file, copy into your environment:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL="editor-arena@your-project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

The private key must keep its `\n` escapes and stay inside double quotes. Paste
it into Vercel exactly as it appears in the JSON file.

> Delete the downloaded JSON once the values are in your secret store. It is a
> full credential and `.gitignore` already blocks `*service-account*.json`.

---

## 3. Google Drive

A service account has **no storage quota of its own**, which matters:

- **Shared Drive (recommended).** Create a Shared Drive, add the service-account
  email as **Content manager**, and put a `Hackathon Submissions` folder inside
  it. Set `GOOGLE_DRIVE_ID` to the Shared Drive ID. Files are owned by the Drive,
  not by a person, so nothing breaks when someone leaves the company.
- **My Drive (works, with a caveat).** Share a folder with the service-account
  email as **Editor**. Uploads consume *your* quota and are owned by the service
  account. Leave `GOOGLE_DRIVE_ID` empty.

Then set the parent folder:

```env
GOOGLE_DRIVE_SUBMISSIONS_FOLDER_ID="1AbCdEf…"   # from the folder URL
GOOGLE_DRIVE_ID=""                              # Shared Drive ID, or empty
```

The app creates `Hackathon_Submissions/<CONTESTANT_ID>/` beneath that folder on
first upload.

**Task ZIP.** Upload it anywhere in Drive, share it so entrants can download
(link-view is fine — it is password-protected), then paste the link into
**Admin → Control panel → Task asset distribution**. Set the ZIP password there
too. Neither is visible to contestants until you release them.

Storage estimate: a 6-hour cohort of 60 editors submitting 300 MB–1 GB each needs
roughly 20–60 GB, plus egress when judges stream. Check the plan before event day.

---

## 4. Google Sheets

1. Create a spreadsheet.
2. Share it with the service-account email as **Editor**.
3. Copy the ID from the URL — `/spreadsheets/d/<THIS>/edit`:

```env
GOOGLE_SHEET_ID="1XyZ…"
GOOGLE_SHEET_TAB="Registrations"
```

The tab is created and its header row written on first sync. Nothing else needs
setting up.

---

## 5. Gmail sending

Two options. Pick one.

### Option A — OAuth refresh token (simplest; works with any Google account)

1. **APIs & Services → OAuth consent screen** — configure it (External is fine;
   add yourself as a test user).
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   Add `https://developers.google.com/oauthplayground` as an authorised redirect
   URI. Note the client ID and secret.
3. Go to <https://developers.google.com/oauthplayground>:
   - Gear icon → **Use your own OAuth credentials** → paste ID and secret.
   - Scope: `https://www.googleapis.com/auth/gmail.send`
   - Authorise as the mailbox that should send (e.g. `arena@yourdomain.com`),
     then **Exchange authorization code for tokens**.
4. Copy the refresh token:

```env
GOOGLE_OAUTH_CLIENT_ID="…apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET="…"
GMAIL_REFRESH_TOKEN="1//…"
GMAIL_SENDER_EMAIL="arena@yourdomain.com"
GMAIL_SENDER_NAME="The Editor Arena"
```

Refresh tokens for an app still in "Testing" expire after 7 days — publish the
consent screen (or set it to Internal on Workspace) before the event.

### Option B — Domain-wide delegation (Google Workspace only)

1. Service account → **Advanced settings** → note the **Client ID**.
2. Workspace Admin console → **Security → Access and data control → API controls
   → Domain-wide delegation → Add new**:
   - Client ID: the one above
   - Scope: `https://www.googleapis.com/auth/gmail.send`
3. Set only `GMAIL_SENDER_EMAIL` (the mailbox to impersonate) and leave the OAuth
   variables empty.

### Sending limits

Gmail allows ~500 recipients/day on consumer accounts and ~2,000 on Workspace.
The queue paces sends and retries failures, but if a cohort plus reminders will
exceed the daily cap, split the broadcast across days or move
`src/lib/email/send.ts` to a transactional provider — it is the single seam.

---

## 6. Deploy to Vercel

```bash
npm i -g vercel
vercel link
vercel --prod
```

Or import the repository at <https://vercel.com/new>. Build settings are picked up
automatically (`npm run build` runs `prisma generate` first).

Set every variable from `.env.example` in **Settings → Environment Variables**,
for Production *and* Preview:

```env
NEXT_PUBLIC_APP_URL="https://arena.yourdomain.com"
DATABASE_URL / DIRECT_DATABASE_URL
AUTH_SECRET                       # openssl rand -base64 32
AUTH_TRUST_HOST="true"
GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
GOOGLE_DRIVE_SUBMISSIONS_FOLDER_ID / GOOGLE_DRIVE_ID
GOOGLE_SHEET_ID / GOOGLE_SHEET_TAB
GMAIL_SENDER_EMAIL / GMAIL_SENDER_NAME
GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GMAIL_REFRESH_TOKEN
CRON_SECRET                       # openssl rand -hex 24
INTEGRATIONS_DRY_RUN="false"      # flip once steps 2–5 are verified
```

`NEXT_PUBLIC_APP_URL` must be the real origin — it is used in email links and in
the Drive CORS origin for uploads.

Add your custom domain under **Settings → Domains**.

---

## 7. Migrate + seed

Run migrations against production once, from your machine:

```bash
DIRECT_DATABASE_URL="postgresql://…direct…" npx prisma migrate deploy
```

Then seed the edition:

```bash
DATABASE_URL="postgresql://…" \
SEED_ADMIN_EMAIL="you@yourdomain.com" \
SEED_ADMIN_PASSWORD="a-real-password" \
SEED_JUDGE_PASSWORD="another-real-password" \
npm run db:seed
```

The seed is idempotent: it creates what is missing and leaves existing FAQs,
prizes and timeline entries alone, so re-running it never overwrites admin edits.

Never set `SEED_DEMO_DATA=true` against production — it inserts fake contestants.

Then, signed in as admin:

1. `/admin/settings` — confirm every date (all IST) and the upload size limit.
2. `/admin/content` — edit FAQs, prizes and the timeline to the real details.
3. `/admin/judges` — add the real jury (email invites include their password).
4. `/admin/settings` — check the integration panel shows Drive ✓ Gmail ✓ Sheets ✓.

Change the seeded admin and judge passwords before sharing any link.

---

## 8. Cron

`vercel.json` already declares the schedule:

```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "*/15 * * * *" }] }
```

Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. Verify after
deploy:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://arena.yourdomain.com/api/cron/reminders
# {"ok":true,"processed":0,"sent":0,"failed":0,"skipped":0,"purgedOtps":0,…}
```

Not on Vercel? Any scheduler works:

```cron
*/15 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://arena.yourdomain.com/api/cron/reminders
```

The admin can also drain the queue on demand from `/admin/emails`, so a cron
outage is recoverable by hand.

---

## 9. Go-live checklist

Health first:

```bash
curl https://arena.yourdomain.com/api/health
# {"ok":true,"database":true,"hackathon":"editor-arena-2026:NOT_STARTED",
#  "integrations":{"dryRun":false,"drive":true,"sheets":true,"gmail":true}}
```

Then walk it:

- [ ] Landing page: countdown correct, timeline and prizes match reality
- [ ] Register a test contestant → ID issued, welcome email received
- [ ] Sheet row appeared with the right columns
- [ ] `/admin/emails` shows 4 reminders queued at the right IST times
- [ ] Sign in with a one-time code; confirm the code is single-use
- [ ] Task ZIP link and password saved in the control panel, both still hidden
- [ ] Advance to `RUNNING` → release assets → announce password → dashboard shows both
- [ ] Advance to `SUBMISSION_OPEN` → upload a real 500 MB+ video end to end
- [ ] File landed in `Hackathon_Submissions/<ID>/`; receipt email received
- [ ] Advance to `JUDGING` → auto-assign → each judge sees their queue only
- [ ] Submit one scorecard → leaderboard updates → scorecard is now read-only
- [ ] Unlock that scorecard as admin → score leaves the average immediately
- [ ] Export the PDF and both spreadsheets; check the numbers by hand once
- [ ] Publish results → leaderboard public, result emails queued
- [ ] Delete the test contestant, reset the event to `NOT_STARTED`, re-check `/api/health`

Do the big-file upload test from a normal home connection, not office fibre.

---

## 10. Event-day runbook

Times assume a 09:30 IST start and a 15:45 IST deadline.

| Time | Action | Where |
|---|---|---|
| T-1 day | Confirm assets uploaded, password set, judges can sign in | `/admin` |
| T-1 hour | Check `/api/health` and that the T-1h reminder went out | `/admin/emails` |
| 09:25 | Advance status to **RUNNING** | `/admin` |
| 09:30 | **Release assets**, then **announce password** | `/admin` |
| 09:35 | Confirm a contestant can download and extract | support channel |
| 10:00 | Advance to **SUBMISSION_OPEN** so early finishers can upload | `/admin` |
| 15:45 | Deadline passes — uploads close automatically | — |
| 15:50 | Review `/admin/submissions`; reject invalid entries with a reason | `/admin` |
| 16:00 | Advance to **JUDGING**, then **Auto-assign** | `/admin` |
| 16:05 | Confirm each judge sees the right count | `/admin/assignments` |
| Judging ends | **Lock judging**, then **Recompute ranking** | `/admin` |
| Verify | Check the top 5 by hand before anything is announced | `/admin/reports` |
| Announce | **Publish results** — leaderboard goes public, emails queue | `/admin` |
| After | Export PDF + XLSX for the hiring conversation | `/admin/reports` |

If the start slips, just delay the status change — nothing is driven by wall-clock
time alone, so a late start never leaks assets early or locks anyone out.

---

## 11. Troubleshooting

**Uploads fail with "Google Drive is not configured".**
`INTEGRATIONS_DRY_RUN` is still `true`, or the service account / folder ID is
missing. Check `/api/health`.

**Drive returns 403 on the upload session.**
The folder is not shared with the service-account email, or it is shared as Viewer
rather than Editor / Content manager.

**"Service Accounts do not have storage quota."**
You are uploading into My Drive with no owner quota. Move the parent folder into a
Shared Drive and set `GOOGLE_DRIVE_ID`.

**Emails never arrive.**
`/admin/emails` shows the real error per row. Common causes: consent screen still
in Testing (refresh token expired after 7 days), missing delegation scope, or the
`Content-Type` of the private key mangled by copy-paste. Retry rows in place after
fixing.

**Everything is 5.5 hours off.**
Event times are entered and displayed in IST. `datetime-local` inputs are parsed
with an explicit `+05:30` offset (`istDateTime` in `src/lib/validations.ts`) —
if you write a date to the database by hand, write UTC.

**`prisma migrate deploy` hangs or errors on a pooled URL.**
Migrations need `DIRECT_DATABASE_URL`, not the pgbouncer URL.

**A judge's scores are wrong and locked.**
`/admin/ratings` → Unlock. The score leaves the average and ranks recompute
immediately; the unlock is recorded on the rating and in the audit log.

**Contestant lost their ID.**
`/admin/contestants` → search → the mail icon resends the welcome email.

**Leaderboard is empty after judging.**
Only *finalised* scorecards count. Check `/admin/ratings` for drafts, then run
**Recompute ranking**.
