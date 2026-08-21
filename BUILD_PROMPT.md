# Claude CLI Build Prompt — The Editor Arena Platform

> **Historical.** This is the brief the platform was built from, kept as a record
> of the original scope. It has not been updated as the build diverged from it —
> auth moved from NextAuth to Supabase, and submissions moved from Drive uploads
> to YouTube links, so `src/lib/auth.ts` and `POST /api/submissions` below no
> longer exist. For how the thing actually works, read `README.md` and
> `DEPLOYMENT.md`.

Copy everything below the line into `claude` from inside the `Website/` directory.
Run it in phases; each phase ends with a verification command that must pass before moving on.

---

## PROMPT

You are continuing work on **The Editor Arena** — the hackathon management platform for
House of EduTech's video editing hiring hackathon. The data and service layer already
exists and is good. **Do not rewrite it.** Your job is to build the application surface on
top of it.

### What already exists (read these first, treat as the contract)

```
prisma/schema.prisma        Complete. 14 models, 8 enums. Do not restructure.
src/lib/prisma.ts           Prisma singleton
src/lib/env.ts              Typed env access — add new vars here, never read process.env directly
src/lib/auth.ts             NextAuth v5 config
src/lib/auth.config.ts      Edge-safe auth config for middleware
src/lib/rbac.ts             Role guards — use these, do not hand-roll auth checks
src/lib/otp.ts              Passwordless login codes
src/lib/rate-limit.ts       Use on every public POST route
src/lib/audit.ts            Write an AuditLog row for every state mutation
src/lib/constants.ts        BRAND, RATING_CRITERIA (6 criteria + weights), ROUTES, PODIUM_SIZE
src/lib/scoring.ts          weightedCriteriaScore, recalculateSubmissionScore,
                            computeRanking, persistRanking, criteriaAverages,
                            derivedStrengthsWeaknesses, judgeSpread
src/lib/hackathon.ts        Active-hackathon accessors and phase logic
src/lib/contestant-id.ts    Mints IDs in the form EA20260001
src/lib/validations.ts      Zod schemas — extend, don't duplicate
src/lib/google/client.ts    Service-account auth
src/lib/google/drive.ts     Drive helpers
src/lib/google/sheets.ts    Sheets append/sync helpers
src/types/next-auth.d.ts    Session type augmentation
```

**What is missing and what you will build:** all of `src/app`, all of `src/components`,
`src/middleware.ts`, `src/lib/google/gmail.ts`, `src/lib/email/templates.ts`,
`prisma/seed.ts` (already referenced by `package.json` but absent), `src/app/globals.css`,
and `vercel.json` for cron.

### The event this serves

100 contestants, one 5h50m online editing sprint, **the champion is announced live 30
minutes after the submission deadline.** That deadline is the hardest constraint in the
system: nothing in the judging path may require a human to wait on a slow query, a manual
export, or a spreadsheet.

- Contestants register → get a contestant ID by email → receive reminder emails →
  download a password-protected ZIP → the password unlocks at event start → they edit →
  they submit **a Google Drive link** (not a file upload)
- 5 judges score submissions 0.0–10.0 with one decimal, across the 6 criteria in
  `RATING_CRITERIA`, plus a holistic `overallScore`
- Ranking: highest average `overallScore` wins. Four podium places (`PODIUM_SIZE = 4`):
  rank 1 iPhone · rank 2 AirPods · ranks 3 and 4 a ₹5,000 Amazon gift voucher each
- Post-event, the same scores and judge feedback drive hiring for **10–15 full-time offers**

---

## Phase 0 — One schema change, then stop

The event runs **two judging rounds** and the schema cannot currently express that:

- **Round 1** — every submission is scored by **2 of the 5 judges** (fan-out; 100
  submissions cannot be seen by all 5 in the available window)
- **Round 2** — the **top 8 only**, scored by **all 5 judges**

Add a round dimension:

```prisma
model JudgeAssignment {
  round Int @default(1)
  @@unique([judgeId, submissionId, round])   // replaces [judgeId, submissionId]
}

model Rating {
  round Int @default(1)
  @@unique([submissionId, judgeId, round])   // replaces [submissionId, judgeId]
}
```

Then extend `src/lib/scoring.ts` with a `round` parameter:
`recalculateSubmissionScore(submissionId, round?)` and `computeRanking(hackathonId, round?)`.
Round 1 average decides who reaches the top 8; the Round 2 average decides the final order
among those 8. Keep both averages readable — do not overwrite Round 1 with Round 2.

Also add to `Hackathon`: `round1JudgesPerSubmission Int @default(2)` and
`finalistCount Int @default(8)`.

Run `npm run db:migrate`, then **stop and report** the migration diff before continuing.

---

## Phase 1 — Foundation: middleware, seed, layout, design system

1. **`src/middleware.ts`** — route protection using `auth.config.ts` (edge-safe; never
   import `prisma` here). `/dashboard/*` requires CONTESTANT, `/judge/*` requires JUDGE,
   `/admin/*` requires ADMIN. Unauthenticated users go to `/login?next=<path>`. A logged-in
   user hitting the wrong role's area gets 403, not a redirect loop.

2. **`prisma/seed.ts`** — idempotent, driven by `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`,
   `SEED_JUDGE_PASSWORD`, `SEED_DEMO_DATA`. Creates: one `Hackathon` (slug
   `editor-arena-2026`, timezone `Asia/Kolkata`, all seven timestamps set to the real
   schedule below), 1 admin, 5 judges, 4 `Prize` rows (position 1 iPhone / 2 AirPods /
   3 and 4 ₹5,000 Amazon voucher), ~15 `Faq` rows, ~8 `TimelineEvent`
   rows. When `SEED_DEMO_DATA=true`, add 12 contestants with submissions and ratings so the
   leaderboard and hiring report have data to render.

   Real schedule (IST, store as UTC):
   ```
   registrationOpensAt   2026-08-06 10:00
   registrationClosesAt  2026-08-26 23:59
   startsAt              2026-09-05 09:30
   taskReleaseAt         2026-09-05 09:30
   submissionDeadline    2026-09-05 15:20
   judgingEndsAt         2026-09-05 15:46
   resultsAt             2026-09-05 15:50
   ```

3. **Design system.** Dark-first, high-contrast, competitive. Near-black surfaces, a single
   red accent (`#d92d20`), tabular numerals for every score and countdown. Build
   `src/app/globals.css` with CSS variables and add the shadcn/ui primitives the installed
   Radix packages imply. Typography and spacing must be consistent across all four
   surfaces — this is one product, not four.

4. **`src/app/layout.tsx`** — fonts, metadata, `<Toaster />` from sonner.

**Verify:** `npm run db:seed && npm run typecheck` passes; `/` returns 200; visiting
`/admin` while logged out lands on `/login`.

---

## Phase 2 — Public site: landing page, registration, FAQ

Routes: `/`, `/register`, `/register/success`, `/faq`, `/login`, `/leaderboard`

**Landing page sections**, all content read from the DB (`Hackathon`, `Prize`, `Faq`,
`TimelineEvent`) so admins can edit without a deploy:

1. Hero — brand, tagline, theme line, primary CTA
2. **Countdown timer** to `startsAt`. Critical: the server is the only clock. Add
   `GET /api/time` returning `{ now, startsAt, submissionDeadline, status }`; the client
   computes an offset once and counts down locally. Never trust `Date.now()` on the client
   for gating. When the countdown reaches zero, the component swaps to a "live now" state
   without a reload.
3. What the challenge is — deliverables, duration, what's provided
4. Prizes — from `Prize` rows, rendered as a four-step ladder (rank 1 iPhone, rank 2 AirPods,
   ranks 3–4 ₹5,000 Amazon voucher). Never hard-code prize text in the component
5. Judging criteria — render `RATING_CRITERIA` with weights, publicly and verbatim
6. Timeline — from `TimelineEvent`
7. Eligibility and tool policy
8. FAQ — accordion from `Faq`, ordered
9. Footer

**Registration** — `POST /api/register`:
- Validate with a zod schema in `src/lib/validations.ts`
- Rate limit by IP
- Reject if `now` is outside `registrationOpensAt … registrationClosesAt`, with a clear message
- Reject duplicate email per hackathon (`@@unique([hackathonId, email])`) with "you're already registered" plus a login link, not a 500
- In one transaction: create `User` (role CONTESTANT) + `Contestant`, minting the ID via `contestant-id.ts`
- Then, **outside** the transaction and each independently failure-tolerant:
  - append the row to Google Sheets, set `sheetRowSyncedAt`
  - send the confirmation email containing the contestant ID
  - create the four `EmailReminder` rows (`THREE_DAYS_BEFORE`, `TWO_DAYS_BEFORE`,
    `ONE_DAY_BEFORE`, `ONE_HOUR_BEFORE`) with `scheduledFor` computed backwards from
    `startsAt`, status SCHEDULED
- **A Google API failure must never lose a registration.** Persist first, integrate after,
  log failures to `AuditLog`, and respect `INTEGRATIONS_DRY_RUN=true` by logging instead of
  calling out.
- Response: the contestant ID, shown on `/register/success` and emailed.

**Login** — passwordless OTP for contestants (`otp.ts`), email + password for judges and
admins. Same `/login` page, branching on what the email resolves to.

**`/leaderboard`** — returns 404 until `Hackathon.resultsPublished` is true.

**Verify:** register a contestant end-to-end with `INTEGRATIONS_DRY_RUN=true`; confirm the
DB has the contestant, 4 scheduled reminders, and an audit row; confirm the countdown is
correct after changing the system clock (it must not be).

---

## Phase 3 — Email engine and cron

1. **`src/lib/google/gmail.ts`** — send via the Gmail API. Support both auth paths the env
   already anticipates: service-account domain-wide delegation impersonating
   `GMAIL_SENDER_EMAIL`, and the `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` / `GMAIL_REFRESH_TOKEN`
   triple, which takes priority when all three are set. Build proper RFC 2822 MIME with an
   HTML and a plain-text part.

2. **`src/lib/email/templates.ts`** — one function per `ReminderType`, returning
   `{ subject, html, text }`. Templates: registration confirmation (contains the contestant
   ID prominently), 3-day, 2-day, 1-day, 1-hour, assets released, submission received,
   results announced. Inline CSS, dark-safe, no external images.

3. **`GET /api/cron/reminders`** — Bearer-auth against `CRON_SECRET`. Selects reminders
   where `status = SCHEDULED AND scheduledFor <= now`, in batches. For each: set SENDING,
   send, set SENT with `providerMessageId`, or FAILED with `lastError` and `attempts + 1`.
   Retry FAILED rows up to 3 attempts. **Idempotency is enforced by the DB** —
   `@@unique([contestantId, type])` means a duplicate can't exist; make sure your code
   relies on that rather than on the cron never double-firing. Skip (SKIPPED) reminders for
   contestants who are WITHDRAWN or DISQUALIFIED.

4. **`vercel.json`** — hourly schedule for `/api/cron/reminders`. Because the 1-hour
   reminder needs better than hourly resolution near the event, also run every 5 minutes on
   event day, or set the cron to `*/10 * * * *` and rely on `scheduledFor` for precision.

5. **Admin manual trigger** — a button that runs the same code path for one contestant or
   one reminder type, so a failure at T-1 is recoverable by a human in seconds.

**Verify:** a unit test that a reminder is never sent twice; a dry-run send that logs all
eight templates; `curl` the cron route without the secret and get 401.

---

## Phase 4 — Contestant dashboard, asset release, submission

Routes: `/dashboard`, `/dashboard/submit`, `/dashboard/profile`

**`/dashboard`** shows: contestant ID, event phase, countdown, the asset panel, the
submission panel, and the rules summary.

**Asset release — get this exactly right, it is the single most load-bearing rule:**

`GET /api/assets` returns, based on server time and admin flags only:

| Condition | Response |
|---|---|
| `!assetsReleased` | `{ state: "pending" }` — nothing else |
| `assetsReleased && !passwordReleased` | `{ state: "download", url }` — **no password field at all** |
| `assetsReleased && passwordReleased` | `{ state: "unlocked", url, password }` |

The password must never appear in any payload, HTML source, JS bundle, or cache before
`passwordReleased` is true. Compute state server-side per request; do not send the whole
`Hackathon` row to the client. Set `Cache-Control: no-store`. Stamp
`Contestant.assetsDownloadedAt` on first download. When the state flips to unlocked, the
dashboard reveals the password by polling `/api/assets` every 15 s — no page reload, and no
client-side timer deciding when it's allowed.

**Submission — Google Drive link, not a file upload:**

`POST /api/submissions` accepts a Drive URL. Then:
1. Parse the file ID from any Drive URL shape (`/file/d/<id>/view`, `?id=<id>`,
   `/drive/folders/<id>`) — reject shortened or non-Drive URLs with a specific message
2. **Verify accessibility server-side** via the Drive API using the service account:
   the file must exist, be a video mime type, and be readable. A private link is the most
   likely failure on the day — reject it at submit time with instructions to set
   "Anyone with the link → Viewer". Never let a judge discover a broken link at 15:25.
3. Store `driveFileId`, `videoUrl`, `previewUrl` (the `/preview` embed form),
   `fileName`, `mimeType`, `sizeBytes`, `durationSeconds` from Drive metadata
4. `isLate = now > submissionDeadline`; reject entirely unless `allowLateSubmission`
5. Status SUBMITTED, `Contestant.status = SUBMITTED`, audit row, "submission received" email
6. Re-submission before the deadline replaces the link and is audited. After the deadline,
   the endpoint returns 403 for everyone.

Show the resolved video inline in an iframe so the contestant can confirm the judges will
actually be able to watch it.

**Verify:** submitting a private Drive link is rejected with an actionable error; submitting
after the deadline returns 403; the password is provably absent from the `/api/assets`
response before release (assert it in a test).

---

## Phase 5 — Judge portal

Routes: `/judge`, `/judge/[submissionId]`

**`/judge`** — the judge's assigned queue for the current round: submission code (never the
contestant's name — scoring is blind), thumbnail, scored/unscored state, and a progress
counter. Sort unscored first. A judge must never see another judge's scores, and must never
see the aggregate leaderboard.

**`/judge/[submissionId]`** — the scoring screen. This is the highest-pressure UI in the
product; the judge has roughly 2 minutes per submission in Round 1.

- Drive video embedded, playing at full width, keyboard-controllable
- Six criteria from `RATING_CRITERIA`, each a slider **and** a numeric input, step `0.1`,
  range 0.0–10.0, showing the weight and the help text
- Live `computedScore` (weighted mean, via `weightedCriteriaScore`) displayed as the judge moves
- A separate holistic `overallScore` — this is what the ranking averages. If it drifts more
  than 1.5 from `computedScore`, show an inline nudge; do not block submission
- Feedback: `comment` (required, min 20 chars), `strengths`, `weaknesses`, and a
  `HiringRecommendation` select — the hiring pipeline depends on this field being filled,
  so make it required
- **Autosave the draft** every few seconds to a non-submitted `Rating`. A judge losing 2
  minutes of scoring at 15:30 is an event-level failure
- "Submit rating" locks it: `isSubmitted = true`, `submittedAt` set, form read-only.
  Only an admin can unlock (`unlockedById`, `unlockedAt`)
- On submit: `recalculateSubmissionScore`, then `persistRanking`, then mark the
  `JudgeAssignment.completedAt`. Wrap in a transaction; audit it
- Keyboard shortcuts: `1`–`6` to focus a criterion, `Enter` to submit, `J`/`K` to move
  through the queue

**Verify:** two judges scoring the same submission concurrently both persist; a locked
rating cannot be edited via a direct API call; the average updates only from submitted
ratings, never drafts.

---

## Phase 6 — Admin portal

Routes: `/admin`, `/admin/contestants`, `/admin/contestants/[id]`, `/admin/submissions`,
`/admin/judges`, `/admin/assignments`, `/admin/scoring`, `/admin/results`,
`/admin/comms`, `/admin/content`, `/admin/hiring`, `/admin/audit`

1. **`/admin` control panel** — the event-day cockpit, one screen, auto-refreshing:
   registered / confirmed / active / submitted counts; the `EventStatus` machine with
   explicit transition buttons (every change writes `EventStatusLog`); **Release assets**
   and **Release password** as two separate, individually confirmed, irreversible-feeling
   actions; judging progress as a judges × submissions matrix; reminder queue health.

2. **`/admin/contestants`** — table with search, status filter, city, experience, portfolio
   link, submission state, score. Bulk actions: confirm, shortlist, disqualify (reason
   required), resend an email. Export to Excel via the installed `exceljs`.

3. **`/admin/assignments`** — the fan-out tool. "Assign Round 1: N judges per submission"
   distributes assignments evenly and randomly with a balanced load per judge, skipping
   pairs that already exist. "Assign Round 2: top N finalists to all judges" does the
   finalist pass. Show the resulting per-judge counts before committing.

4. **`/admin/scoring`** — live matrix of every submission × judge, cells coloured by score,
   showing `judgeSpread` per submission so a mis-calibrated judge is visible immediately.
   Unlock a rating from here.

5. **`/admin/results`** — the ranked leaderboard from `computeRanking`, with a
   **Publish results** action that sets `judgingLocked` and `resultsPublished`, persists
   ranks and podium flags, and queues the `RESULTS_ANNOUNCED` email to all contestants.
   Publishing is one click because at 15:50 there is no time for anything else. Require a
   typed confirmation, and make it reversible by an admin.

6. **`/admin/hiring`** — the reason the event exists. One row per contestant with: final
   score, per-criterion averages (`criteriaAverages`), the modal `HiringRecommendation`
   across judges, all judge comments concatenated, portfolio link, experience, city,
   software skills. Filter by recommendation. Export to Excel and push to a Sheets tab.
   Target: identify **10–15 STRONG_HIRE / HIRE** candidates. Include contestants who did
   **not** reach the podium — the hiring pool is the whole field, not the top 4.

7. **`/admin/content`** — CRUD for `Faq`, `Prize`, `TimelineEvent`, and the `Hackathon`
   timestamps, so the landing page is editable without a deploy.

8. **`/admin/comms`** — reminder queue with status, manual send, retry failures, per-type counts.

9. **`/admin/audit`** — paginated `AuditLog` with actor, action, entity, and diff.

**Verify:** publishing results is idempotent; the hiring export contains every non-DQ
contestant with at least one submitted rating; assignment fan-out never creates duplicates.

---

## Phase 7 — Hardening

- Every public POST rate-limited; every mutation audited; every admin action confirmed
- `Cache-Control: no-store` on `/api/assets`, `/api/time`, and all judge and admin routes
- Zod validation at every API boundary, including params
- `BigInt` (`Submission.sizeBytes`) serialised safely — do not let it reach `JSON.stringify` raw
- All times stored UTC, rendered `Asia/Kolkata` via the installed `date-fns-tz`
- Error boundaries and `loading.tsx` on every route group
- Mobile: the landing page and registration must be excellent on a phone. The judge portal
  is desktop-first and may say so
- `npm run lint && npm run typecheck && npm run build` all clean
- Write `DEPLOYMENT.md`: Google Cloud service-account setup (Drive + Sheets + Gmail APIs,
  domain-wide delegation), the Shared Drive requirement, Vercel env vars, cron config,
  migration order, and the event-day runbook for releasing assets and the password

---

## Rules for how you work

1. **Do not modify** `prisma/schema.prisma` beyond Phase 0, or rewrite anything in
   `src/lib/` except to extend it. If you believe a lib function is wrong, say so and stop —
   don't silently replace it.
2. Use the existing helpers. `rbac.ts` for authorization, `audit.ts` for logging,
   `rate-limit.ts` for public endpoints, `env.ts` for configuration, `scoring.ts` for
   anything numeric. Duplicating this logic is the main way this build goes wrong.
3. Server Components by default. Client Components only where interactivity requires it —
   countdown, sliders, autosave, polling.
4. After each phase: run `npm run typecheck`, run the phase's verify step, and report what
   you did and what you deferred. Do not start the next phase without saying the previous
   one passed.
5. Keep `INTEGRATIONS_DRY_RUN=true` working throughout. The whole app must be developable
   and demonstrable with no Google credentials.
6. If a requirement here conflicts with what the code already does, flag the conflict rather
   than guessing.

Start with Phase 0. Show me the migration before you run anything else.
