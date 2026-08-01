# The Editor's Arena

Hackathon management platform for a professional video-editing hiring competition.
Handles the whole lifecycle: registration → contestant IDs → automated email
reminders → gated asset release → YouTube link submission → multi-judge
scoring → automatic ranking → hiring report.

Built to run multiple editions: an edition is a `Hackathon` row, not a code branch.

---

## Contents

- [Stack](#stack)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [The lifecycle](#the-lifecycle)
- [Roles and access](#roles-and-access)
- [Scoring and ranking](#scoring-and-ranking)
- [Submissions: why YouTube links](#submissions-why-youtube-links)
- [Email automation](#email-automation)
- [Reports](#reports)
- [Security model](#security-model)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Deployment](#deployment)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Actions) |
| Language | TypeScript, strict |
| UI | Tailwind CSS 3.4 + shadcn-style Radix primitives + Framer Motion |
| Database | PostgreSQL + Prisma ORM |
| Auth | Auth.js / NextAuth v5 — credentials (password) and email one-time codes |
| Submissions | Unlisted YouTube links, embedded for judging |
| Email | SMTP via `nodemailer` (queued, retried, auditable) |
| Storage | Supabase Storage — contestant profile photos only (optional) |
| Reports | `pdf-lib` (PDF) and `exceljs` (XLSX) |
| Hosting | Vercel-compatible (cron included) |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#    Minimum to boot: DATABASE_URL, DIRECT_DATABASE_URL, AUTH_SECRET.
#    Leave INTEGRATIONS_DRY_RUN=true until SMTP credentials exist —
#    emails then log to the console instead of failing.
openssl rand -base64 32     # paste into AUTH_SECRET

# 3. Database
npm run db:deploy           # apply migrations (or `npm run db:migrate` in dev)
npm run db:seed             # 2026 edition + admin + 5 judges + FAQs/prizes/timeline

# 4. Run
npm run dev                 # http://localhost:3000
```

Seeded logins are printed by the seed script. Set `SEED_DEMO_DATA=true` before
seeding to also generate 12 demo contestants with submissions, scorecards and
ranks — useful for reviewing every screen before real registrations exist.

The landing page renders even with no database reachable (it falls back to seed
content), so a misconfigured deployment never shows a blank marketing site.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Landing page (public)                                          │
│  hero + countdown · about · timeline · prizes · FAQ (DB-driven)  │
└───────────────┬─────────────────────────────────────────────────┘
                │ register (server action)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Registration          → mint EA2026NNNN inside a transaction   │
│                        → queue welcome + 4 reminders            │
└───────────────┬─────────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Contestant dashboard  gated by EventStatus + admin release     │
│  assets (locked) → ZIP password (locked) → submit → scorecard   │
└───────────────┬─────────────────────────────────────────────────┘
                │ contestant pastes an unlisted YouTube link
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Judge portal          only assigned submissions                │
│  embedded YouTube player + 6 criteria + overall + feedback      │
│  draft → submit (locks; admin can unlock)                       │
└───────────────┬─────────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Ranking engine        average of finalised overall scores      │
│  → leaderboard · results emails · PDF/XLSX hiring report        │
└─────────────────────────────────────────────────────────────────┘
```

Everything a participant can see or do is derived in one place —
`computeGates()` in `src/lib/hackathon.ts` — from the event status plus the
admin's release switches. Adding a rule means changing one function, not
auditing every page.

---

## The lifecycle

The admin drives five states from `/admin`. Transitions are validated
(`STATUS_FLOW`), logged to `EventStatusLog`, and take effect instantly.

| State | Contestants can | Judges can |
|---|---|---|
| `NOT_STARTED` | Register, sign in | — |
| `RUNNING` | See assets **if released**, see ZIP password **if announced** | — |
| `SUBMISSION_OPEN` | Upload / replace their video | — |
| `JUDGING` | View status only | Score assigned submissions |
| `COMPLETED` | See scorecard + leaderboard **if published** | Read-only |

Asset release and password announcement are **two independent switches**, so the
download can go out ahead of the start gun while the password stays hidden until
the moment the clock starts.

---

## Roles and access

- **Contestant** — signs in with a 6-digit emailed code (or an optional password
  they set). Sees only their own submission and scorecard.
- **Judge** — password login. Sees only submissions assigned to them. Cannot edit
  a scorecard once submitted.
- **Admin** — full access: contestants, submissions, judges, assignments,
  ratings, email queue, landing-page content, event control, exports.

Enforcement is layered: `middleware.ts` gates by route prefix at the edge, and
every page calls `requireRole()` while every server action and API route calls
`assertRole()`. Middleware alone is not treated as a security boundary.

---

## Scoring and ranking

Each judge scores six criteria from **0.0 to 10.0** (one decimal), plus a
holistic **overall score**:

| Criterion | Weight |
|---|---|
| Creativity | 20% |
| Storytelling | 20% |
| Editing Skill | 20% |
| Motion Graphics | 15% |
| Sound Design | 15% |
| Technical Quality | 10% |

- **Final score** = mean of the judges' *overall* scores, to 2 decimals
  (e.g. 8.5, 9.0, 8.8, 9.2, 8.7 → **8.84**).
- Weights produce `computedScore`, a criteria-derived cross-check shown beside
  each judge's overall score. Drift over 1.5 points is flagged in the UI, and the
  admin's Ratings page surfaces submissions where judges disagree by more than 2
  points — the calibration conversation the organiser needs to have.
- Only **finalised** scorecards count. Drafts never move the leaderboard.
- Ties share a rank (1, 2, 2, 4); earliest upload breaks the display order.
- Rank 1 is the winner; ranks 2–4 are runners-up.

Weights live in `RATING_CRITERIA` (`src/lib/constants.ts`) — change them there
and the UI, the cross-check and the reports all follow.

---

## Submissions: why YouTube links

Entrants export a multi-gigabyte video, and moving that file is the whole
problem. A serverless request body caps out around 4.5 MB on Vercel, so it can
never be proxied through the app — and hosting the files ourselves means storage
cost, transcoding, and a player to maintain.

A link sidesteps all of it. The contestant uploads an unlisted video to their own
YouTube account and pastes the URL. YouTube absorbs the bandwidth, the
transcoding and the playback, and judges get scrubbing and quality selection for
free.

`src/lib/youtube.ts` parses the id out of `watch?v=`, `youtu.be/` and `/shorts/`
forms, and the id is stored alongside the raw URL so the judge portal can embed
without re-parsing. The link is write-once: after the submission leaves
`NOT_SUBMITTED` only an admin can change it. Late submissions are either refused
or accepted-and-flagged, per the `allowLateSubmission` setting.

The trade-off is that entrants must have a YouTube account, and an accidentally
*private* video is invisible to judges — unlisted is what the instructions ask
for. Legacy Drive columns remain on `Submission` for entries made before the
switch, and the judge player still falls back to them.

---

## Email automation

Plain SMTP, via a queue (`EmailReminder`) rather than fire-and-forget:

| Trigger | Email |
|---|---|
| On registration | Welcome — contestant ID, dates, instructions |
| T-3 days | "Your hackathon is coming soon" |
| T-2 days | "Prepare your setup" |
| T-1 day | "Final reminder" |
| T-1 hour | "Hackathon starts in 1 hour" |
| Assets released | "Task files are live" |
| Upload received | Submission receipt |
| Results published | Score, rank and scorecard link |

- `/api/cron/reminders` drains the queue every 15 minutes (`vercel.json`),
  authenticated with `CRON_SECRET`.
- Each row is claimed with a conditional `SCHEDULED → SENDING` update, so
  overlapping cron runs cannot double-send.
- Two retries, then the row parks as `FAILED` with the error visible — and
  retriable — on `/admin/emails`.
- Changing the start date re-queues every pending reminder automatically.
- A send failure never rolls back the action that triggered it. Registration
  succeeds even if the mail relay is down.

---

## Reports

From `/admin/reports`:

- **Hiring report (PDF)** — cover page with the summary ranking, then one section
  per candidate: contact details, portfolio links, per-criterion score bars,
  final score, judge spread, strengths, weaknesses, every judge's written
  feedback, and a consensus hiring recommendation (ties broken conservatively).
- **Hiring report (XLSX)** — three sheets: Summary (one row per candidate),
  Scorecards (one row per judge per candidate), Criteria (per-criterion averages).
- **Registrations (XLSX)** — the full applicant pool, useful as a hiring database
  beyond the competition itself.

---

## Security model

- Role-based access control at three layers (edge, page, action/route).
- Passwords hashed with bcrypt (cost 12). Login codes are CSPRNG-generated,
  hashed at rest, single-use, 10-minute TTL, 5 attempts max.
- Authentication timing is equalised so response time doesn't reveal whether an
  email is registered; OTP requests always report success.
- Every input validated with Zod at the server boundary — client validation is
  convenience only.
- Contestants cannot read another contestant's submission or scores. Judges only
  ever load submissions assigned to them.
- Judges cannot modify a submitted scorecard; an admin unlock is recorded on the
  rating row (`unlockedById`, `unlockedAt`) and immediately removes that score
  from the average.
- ZIP password is stored server-side and returned only when both release flags
  are set; it is never included in an email.
- Rate limiting on registration, login and OTP requests.
- Destructive and outward-facing admin actions require a typed reason or an
  explicit confirmation, and all of them write to `AuditLog`.
- Security headers set in `next.config.ts`; secrets never reach the client.

---

## Project structure

```
prisma/
  schema.prisma            11 models, 8 enums
  migrations/              generated SQL (checked in)
  seed.ts                  idempotent seed + optional demo cohort
src/
  app/
    page.tsx               landing (DB-driven, degrades gracefully)
    register/  login/      public flows
    leaderboard/           public results, gated until published
    dashboard/             contestant: overview, submit, scorecard, profile
    judge/                 queue, review/[id], completed
    admin/                 control panel, contestants, submissions, judges,
                           assignments, ratings, emails, content, reports, settings
    api/
      auth/[...nextauth]/  Auth.js handler
      submissions/         upload-session, complete
      cron/reminders/      queue drain (CRON_SECRET)
      reports/hiring/      PDF / XLSX / registrations
      health/              probe
  components/
    ui/                    Radix-based primitives (button, card, table, …)
    landing/  dashboard/  judge/  admin/  shell/  forms/  shared/
  lib/
    auth.ts auth.config.ts rbac.ts otp.ts     identity & access
    hackathon.ts                              event state + access gates
    scoring.ts                                weighted scores, ranking engine
    google/                                   client, drive, sheets
    email/                                    templates, smtp, send, reminders
    reports/                                  hiring-report, pdf, excel
    validations.ts constants.ts defaults.ts   schemas, rubric, seed content
  server/actions/                             registration, judging, admin/*
  middleware.ts                               edge role gate
```

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create + apply a migration (dev) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:push` | Push schema without a migration (prototyping) |
| `npm run db:seed` | Seed the active edition |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop, re-migrate, re-seed (destructive) |

---

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full walkthrough: Postgres,
Postgres, SMTP mail, Vercel cron, environment variables, a go-live checklist and
an event-day runbook.
