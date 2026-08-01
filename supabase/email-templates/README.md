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

## These are not the app's emails

Nothing the app sends passes through here. Registration, the four reminders,
task-files-released, submission-received, results, judge invites and the sign-in
fallback code are all built in `src/lib/email/templates.ts` and go out over SMTP
from `src/lib/email/send.ts`.

Supabase Auth is a separate sender that this app does not use — it authenticates
against its own `users` table via NextAuth. These templates only fire if someone
creates a Supabase Auth user directly, which nothing in this codebase does. Keep
them presentable rather than broken, but do not expect traffic.

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
