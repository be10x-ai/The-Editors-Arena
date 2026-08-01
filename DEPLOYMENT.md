# Deployment Guide — The Editor's Arena

Target: Vercel + managed PostgreSQL + an SMTP mailbox.
Everything below also works on any Node 20+ host; only the cron wiring differs.

Budget about 30 minutes for a first-time setup.

---

## 0. Order of operations

1. [Database](#1-database)
2. [Email sending](#2-email-sending)
3. [Deploy to Vercel](#3-deploy-to-vercel)
4. [Migrate + seed](#4-migrate--seed)
5. [Cron](#5-cron)
6. [Go-live checklist](#6-go-live-checklist)
7. [Event-day runbook](#7-event-day-runbook)
8. [Troubleshooting](#8-troubleshooting)

Keep `INTEGRATIONS_DRY_RUN=true` until step 2 is done. In dry-run the app runs
normally but logs emails instead of sending them, so a half-configured
deployment can't email 500 people by accident.

Entries are YouTube links, so there is no file storage to configure. Supabase
Storage is used only for contestant profile photos, and is optional.

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

## 2. Email sending

The app talks SMTP directly, through one seam — `src/lib/email/send.ts`. Any
host with a mailbox works; take the values from that host's control panel.

```env
SMTP_HOST="smtp.yourhost.com"
SMTP_PORT="465"
SMTP_SECURE="true"                # true on 465 (implicit TLS), false on 587
SMTP_USER="noreply@yourdomain.com"
SMTP_PASSWORD="…"
MAIL_FROM_EMAIL="noreply@yourdomain.com"   # keep identical to SMTP_USER
MAIL_FROM_NAME="The Editor's Arena"
```

Two things bite here. `SMTP_SECURE` must be `true` on port 465 — leave it false
and the connection hangs rather than erroring. And `MAIL_FROM_EMAIL` must be the
authenticated mailbox; most relays reject, or silently rewrite, a From address
they do not own.

The site's own domain is irrelevant to sending, so a `*.vercel.app` deployment
is fine.

Verify before trusting it:

```bash
npm run email:test              # sends to SMTP_USER
npm run email:test you@example.com
```

It checks the credentials first, so a bad password is a clear rejection rather
than a half-finished send.

### If you also use Supabase Custom SMTP

Supabase's Custom SMTP screen takes these same credentials, but it is a separate
sender on the same mailbox — not a hop these emails pass through. It carries
only Supabase Auth's six templates, and this app does not use Supabase Auth. Set
both if you want; they do not conflict, and neither is required by the other.

### Sending limits

Shared-hosting mailboxes are usually capped per hour (often ~100) and per day.
The queue paces sends and retries failures, but a full contestant list across
four reminder waves can exceed a modest cap — check the plan's limit before the
first broadcast, or the tail of the queue bounces. `/admin/emails` shows what
failed and lets you retry.

---

## 3. Deploy to Vercel

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
SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASSWORD
MAIL_FROM_EMAIL / MAIL_FROM_NAME
NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   # optional, photos only
CRON_SECRET                       # openssl rand -hex 24
INTEGRATIONS_DRY_RUN="false"      # flip once step 2 is verified
```

`NEXT_PUBLIC_APP_URL` must be the real origin — every link in every email is
built from it, so left at localhost the emails point at the recipient's machine.

Add your custom domain under **Settings → Domains**.

---

## 4. Migrate + seed

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
4. `/admin` — confirm the dry-run banner is gone, so email is live.

Change the seeded admin and judge passwords before sharing any link.

---

## 5. Cron

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

## 6. Go-live checklist

Health first:

```bash
curl https://arena.yourdomain.com/api/health
# {"ok":true,"database":true,"hackathon":"editor-arena-2026:NOT_STARTED",
#  "integrations":{"dryRun":false,"email":true}}
```

Then walk it:

- [ ] Landing page: countdown correct, timeline and prizes match reality
- [ ] Register a test contestant → ID issued, welcome email received
- [ ] `/admin/emails` shows 4 reminders queued at the right IST times
- [ ] Sign in with the registration password
- [ ] Sign in via "Email me a code instead"; confirm the code is single-use
- [ ] Task ZIP link and password saved in the control panel, both still hidden
- [ ] Advance to `RUNNING` → release assets → announce password → dashboard shows both
- [ ] Advance to `SUBMISSION_OPEN` → submit a YouTube link end to end
- [ ] Link accepted and playable in the judge portal; receipt email received
- [ ] Advance to `JUDGING` → auto-assign → each judge sees their queue only
- [ ] Submit one scorecard → leaderboard updates → scorecard is now read-only
- [ ] Unlock that scorecard as admin → score leaves the average immediately
- [ ] Export the PDF and both spreadsheets; check the numbers by hand once
- [ ] Publish results → leaderboard public, result emails queued
- [ ] Delete the test contestant, reset the event to `NOT_STARTED`, re-check `/api/health`

Do the big-file upload test from a normal home connection, not office fibre.

---

## 7. Event-day runbook

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

## 8. Troubleshooting

**Pushing to `main` produces no Vercel deployment at all — no build, no error.**
This is the failure mode where the dashboard says "Connected" but the Vercel
GitHub App has no access to the repository. Vercel never receives the push, so
there is nothing to fail and nothing is logged. Confirm it from the GitHub side —
Vercel posts a commit status on every build it attempts, so an empty result means
it never tried:

```bash
SHA=$(git rev-parse HEAD)
gh api "repos/<owner>/<repo>/commits/$SHA/status" --jq '{state, count: (.statuses|length)}'
# {"state":"pending","count":0}   <- Vercel is not building this repo
```

Fix, in order:

1. **Grant the App the repo.** <https://github.com/settings/installations> →
   *Vercel* → Configure → under *Repository access* add this repository (or pick
   "All repositories"). A project connected while the App lacked access stays
   silently dead until this is done.
2. **Check the project is linked to the right repo.** Vercel → Project →
   Settings → Git. If it shows no repository, connect it there.
3. **Check the production branch** is `main` (Settings → Git → Production
   Branch). A project defaulting to `master` ignores every push to `main`.
4. **Check Ignored Build Step** (Settings → Git) is empty. A leftover script
   that exits 0 cancels every build.
5. Push an empty commit to retrigger: `git commit --allow-empty -m "trigger" && git push`.

If the App cannot be fixed (org policy, no admin rights), use the CI fallback at
`.github/workflows/deploy.yml`, which drives the Vercel CLI directly and needs
only `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as repo secrets.
Note it still reads env vars from the Vercel project via `vercel pull`, so step 6
above is a prerequisite either way.

**The build is rejected with "Hobby accounts are limited to daily cron jobs".**
`vercel.json` declared `*/15 * * * *`. It is now `0 3 * * *`; the 15-minute
reminder cadence moved to `.github/workflows/reminders.yml`. Vercel validates
`crons` before building, so this rejects the deployment rather than failing it.

**Every page takes 5-7 seconds.**
The functions were running in `iad1` (Washington) while the database sits in
`ap-south-1` (Mumbai), so every query crossed the Atlantic twice. Check the
compute region — it is the *second* field of `x-vercel-id`, not the first:

```bash
curl -sI https://<host>/api/health | grep x-vercel-id
# x-vercel-id: bom1::iad1::…   <- edge Mumbai, compute Washington: wrong
# x-vercel-id: bom1::bom1::…   <- both Mumbai: right
```

`vercel.json` pins `"regions": ["bom1"]`. Measured effect: `/api/health` DB
latency 3140ms → 18ms, and `/` TTFB 5.4s → 0.26s warm. If you move the database,
move this too — they must stay in the same region.

**Every route 404s (`NOT_FOUND`) but files in `public/` still serve.**
The project was detected as a **static site**, not Next.js: Vercel ran the build,
then published only `public/` and threw the server output away. The tell is that
`/logo.png` returns an image while `/` and `/api/health` return `NOT_FOUND` —
including `/robots.txt`, which this app generates from `src/app/robots.ts`.

Deployment Protection is a red herring here; the 404 persists with a protection
bypass token (`vercel curl <url>/api/health`), which proves it is not an auth
wall.

`vercel.json` now pins it, so the setting lives in version control rather than in
dashboard state that can silently change:

```json
{ "framework": "nextjs" }
```

Note `vercel.json` rejects unknown keys, so it cannot carry `//` comments.

**Build fails: "The pattern ... defined in `functions` doesn't match any
Serverless Functions inside the `api` directory."**
`vercel.json`'s `functions` block does not address App Router route handlers —
that key targets the legacy `api/` directory convention, so any glob pointing at
`src/app/api/**` matches nothing and Vercel rejects the config. Per-route limits
belong in the route file itself as Route Segment Config:

```ts
export const maxDuration = 60;
```

The block has been removed; `/api/reports/hiring`, `/api/submissions/complete`
and `/api/cron/reminders` each declare their own `maxDuration`.

**Deploy succeeds but every page 500s.**
The build never needs the database — `src/lib/env.ts` throws at no point during
import, and all data pages are `force-dynamic`. So a green build with red pages
means runtime env vars are missing. `DATABASE_URL`, `DIRECT_DATABASE_URL`,
`AUTH_SECRET`, `AUTH_TRUST_HOST=true` and `NEXT_PUBLIC_APP_URL` are the ones that
break everything; check `/api/health` first.

**Looking for `.htaccess`.**
There isn't one, and adding one would have no effect. `.htaccess` is read by
Apache; Vercel does not run Apache. Redirects, headers, rewrites and cron all
live in `vercel.json` and `next.config.ts` instead — the security headers that
would normally go in `.htaccess` are already set in `next.config.ts`.

**A submission link is rejected.**
Only YouTube URLs are accepted, and the parser wants a recognisable video id —
`youtube.com/watch?v=…`, `youtu.be/…` or a `/shorts/` link. A channel or playlist
URL will not pass. Unlisted is fine; private is not, since judges cannot open it.

**Profile photo upload fails with "Bucket not found".**
The `avatars` bucket does not exist yet:

```bash
npm run storage:setup
```

Idempotent, and it refuses to continue if the bucket exists but is private —
which would break image URLs silently rather than at upload.

**Profile photo upload fails some other way.**
`NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. Everything
else keeps working without them — only photos are affected.

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
