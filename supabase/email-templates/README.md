# Supabase Auth email templates

Paste these into **Supabase → Authentication → Emails → Templates**. They are
kept here so a dashboard-only edit is not the single copy, and so the styling
stays in step with `src/lib/email/templates.ts`.

| File | Supabase template | Action |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Link |
| `invite-user.html` | Invite user | Link |
| `magic-link.html` | Magic link or OTP | Link **and** code |
| `change-email.html` | Change email address | Link |
| `reset-password.html` | Reset password | Link **and** code |
| `reauthentication.html` | Reauthentication | Code only |

## Only one of these has traffic

Most of what the app sends does not pass through here. Registration, the four
reminders, task-files-released, submission-received, results and judge invites
are all built in `src/lib/email/templates.ts` and go out over SMTP from
`src/lib/email/send.ts`.

**`magic-link.html` is the exception, and it is the sign-in code contestants
actually receive.** Sign-in calls `supabase.auth.signInWithOtp`
(`src/server/actions/auth-actions.ts`), so Supabase sends that mail, from the
mailbox configured in Supabase's own Custom SMTP screen — not from this app's
SMTP settings. Treat it as production copy.

The other five are unreachable today, and each for a specific reason:

- **Confirm signup** — accounts are created server-side with `email_confirm: true`
  (`src/lib/supabase/auth-admin.ts`), so there is nothing to confirm.
- **Invite user** — judges are created through the admin API, not
  `inviteUserByEmail`.
- **Reset password** — the app never calls `resetPasswordForEmail`; a forgotten
  password is handled by the OTP code path instead.
- **Change email** — no code path changes an address; the app treats email as
  immutable.
- **Reauthentication** — never triggered.

Keep them presentable rather than broken: any of the five becomes live the moment
someone adds the matching call.

## Placeholders

Supabase interpolates Go template variables:

- `{{ .ConfirmationURL }}` — the full action link
- `{{ .Token }}` — the six-digit code
- `{{ .Email }}` — the recipient, and on a change-email the *current* address
- `{{ .NewEmail }}` — change-email only, the address being moved to
- `{{ .SiteURL }}` — the project's configured site URL

Not every variable exists in every template, and referencing a missing one
renders empty rather than erroring — so a broken template looks fine in the
editor and ships with a hole in it.

**Reauthentication has no `{{ .ConfirmationURL }}`.** It is a code-only flow, so
that template has no button by design. Adding one produces a live link to
nowhere.

## Editing notes

Email clients are not browsers. What is here is deliberate:

- Tables for layout, every style inline — no `<style>` block, no flexbox.
- The button cell sets a solid `background` *before* the gradient, because
  Outlook drops the gradient and would otherwise render dark text on nothing.
- The raw URL appears under the button. A confirmation mail whose button fails
  to render is a dead end, and that is the one link that has to work.
- The preheader `<span>` is hidden but padded, so clients do not pull the body
  text in beside the subject.

## Palette

Six values, and they are the site's, not invented here — `src/app/globals.css`
resolved to hex, with the accent taken from `arena.blue` in `tailwind.config.ts`.
Keep them identical to `COLORS` in `src/lib/email/templates.ts` so the Supabase
mail and the app's own mail look like one sender.

| Role | Hex | Source |
|---|---|---|
| Page background | `#060b13` | `--background` |
| Card | `#0e1520` | `--card` |
| Border | `#222e3f` | `--border` |
| Body text | `#eef2f6` | `--foreground` |
| Muted text | `#9facbc` | `--muted-foreground` |
| Accent | `#1668ff` → `#0b3fa8` | `arena.blue` → `arena.blue-deep` |

Button labels are `#ffffff`. White clears 4.5:1 on `#1668ff`; the near-black
label this palette replaced was correct on the old amber and is not on blue.

The tinted code box pairs `rgba(22,104,255,.12)` with a solid `#0d1b33` in front
of it, for the same reason the button does — Outlook drops the translucent one.
