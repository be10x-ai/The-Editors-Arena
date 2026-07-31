"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Copy } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HEARD_FROM_OPTIONS,
  JOB_ROLE_OPTIONS,
  SOFTWARE_OPTIONS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { registerContestant } from "@/server/actions/registration";
import { idleState } from "@/server/actions/types";

const EXPERIENCE_OPTIONS = [
  { value: "0", label: "Less than a year" },
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "4", label: "4 years" },
  { value: "5", label: "5 years" },
  { value: "7", label: "6–8 years" },
  { value: "10", label: "9+ years" },
];

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs font-medium text-rose-300">{errors[0]}</p>;
}

export function RegistrationForm() {
  const [state, formAction] = useActionState(registerContestant, idleState as never);

  const fieldErrors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  /** Text value the server echoed for a field, for use as `defaultValue`. */
  const prev = (name: string) => {
    const v = values[name];
    return typeof v === "string" ? v : "";
  };
  const prevSkills = Array.isArray(values.softwareSkills) ? values.softwareSkills : [];

  const [skills, setSkills] = React.useState<string[]>(prevSkills);

  // A rejected submit returns a fresh `values`; re-seed so the chips match what
  // was actually sent rather than whatever the component happened to hold.
  const seededFrom = React.useRef<string>("");
  const seedKey = prevSkills.join("|");
  if (seedKey && seedKey !== seededFrom.current) {
    seededFrom.current = seedKey;
    if (seedKey !== skills.join("|")) setSkills(prevSkills);
  }

  React.useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  if (state.status === "success" && state.data) {
    return (
      <RegistrationSuccess
        contestantId={state.data.contestantId}
        email={state.data.email}
      />
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <div>
            <AlertTitle>Registration not completed</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      <fieldset className="space-y-5">
        <legend className="label-eyebrow mb-4">1 · About you</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name *</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={prev("fullName")}
              autoComplete="name"
              placeholder="Ananya Sharma"
              required
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
            <FieldError errors={fieldErrors.fullName} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              defaultValue={prev("email")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              aria-invalid={Boolean(fieldErrors.email)}
            />
            <FieldError errors={fieldErrors.email} />
            <p className="text-xs text-muted-foreground">
              Your contestant ID, reminders and login codes all go here.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (WhatsApp) *</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={prev("phone")}
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              required
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            <FieldError errors={fieldErrors.phone} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              name="city"
              defaultValue={prev("city")}
              autoComplete="address-level2"
              placeholder="Bengaluru"
              required
              aria-invalid={Boolean(fieldErrors.city)}
            />
            <FieldError errors={fieldErrors.city} />
          </div>
        </div>
      </fieldset>

      <div className="hairline" />

      <fieldset className="space-y-5">
        <legend className="label-eyebrow mb-4">2 · Your work</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="experienceYears">Years of video editing experience *</Label>
            <Select
              name="experienceYears"
              required
              defaultValue={prev("experienceYears") || undefined}
            >
              <SelectTrigger id="experienceYears">
                <SelectValue placeholder="Select experience" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.experienceYears} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobRole">Current job role *</Label>
            <Select name="jobRole" required defaultValue={prev("jobRole") || undefined}>
              <SelectTrigger id="jobRole">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {JOB_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.jobRole} />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Editing software skills *</Label>
          {/* Buttons plus hidden inputs rather than checkboxes. React 19 resets
              the form once the action settles, which set every checkbox back to
              unchecked in the DOM while React state still said selected — so the
              chips looked picked but submitted nothing, and validation kept
              rejecting "Pick at least one tool". Hidden inputs rendered straight
              from state cannot drift that way. */}
          {skills.map((software) => (
            <input
              key={software}
              type="hidden"
              name="softwareSkills"
              value={software}
            />
          ))}
          <div className="flex flex-wrap gap-2">
            {SOFTWARE_OPTIONS.map((software) => {
              const checked = skills.includes(software);
              return (
                <button
                  key={software}
                  type="button"
                  aria-pressed={checked}
                  onClick={() =>
                    setSkills((current) =>
                      current.includes(software)
                        ? current.filter((value) => value !== software)
                        : [...current, software],
                    )
                  }
                  className={cn(
                    "select-none rounded-full border px-3.5 py-2 text-sm font-medium transition",
                    checked
                      ? "border-amber-400/50 bg-amber-500/20 text-foreground"
                      : "border-white/12 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-foreground",
                  )}
                >
                  {software}
                </button>
              );
            })}
          </div>
          <FieldError errors={fieldErrors.softwareSkills} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="portfolioUrl">Portfolio or showreel link *</Label>
            <Input
              id="portfolioUrl"
              name="portfolioUrl"
              defaultValue={prev("portfolioUrl")}
              type="url"
              inputMode="url"
              placeholder="https://yourportfolio.com"
              required
              aria-invalid={Boolean(fieldErrors.portfolioUrl)}
            />
            <FieldError errors={fieldErrors.portfolioUrl} />
            <p className="text-xs text-muted-foreground">
              This is the single field the screening panel spends the most time on. Link
              your strongest work, not everything.
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="heardFrom">How did you hear about this?</Label>
            <Select name="heardFrom" defaultValue={prev("heardFrom") || undefined}>
              <SelectTrigger id="heardFrom">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {HEARD_FROM_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      <div className="hairline" />

      <fieldset>
        <legend className="label-eyebrow mb-4">3 · Choose a password</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
            <FieldError errors={fieldErrors.password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password *</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              minLength={8}
              required
            />
            <FieldError errors={fieldErrors.confirmPassword} />
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          You&apos;ll sign in with this email and password to reach your dashboard,
          download the footage and upload your final video.
        </p>
      </fieldset>

      <div className="hairline" />

      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <Checkbox id="consent" name="consent" required className="mt-0.5" />
        <Label htmlFor="consent" className="text-sm font-normal leading-relaxed">
          I confirm I am 18 or older, the work I submit will be my own, and I accept the
          competition rules, the confidentiality agreement on the provided footage, and
          the licence to showcase my submission with credit.
        </Label>
      </div>
      <FieldError errors={fieldErrors.consent} />

      <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Registering…">
        Complete registration
        <ArrowRight />
      </SubmitButton>
    </form>
  );
}

function RegistrationSuccess({
  contestantId,
  email,
}: {
  contestantId: string;
  email: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(contestantId);
      setCopied(true);
      toast.success("Contestant ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — write it down instead.");
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-8 text-center sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300">
          <CheckCircle2 className="size-7" />
        </span>

        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">
          You&apos;re registered
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          A confirmation email is on its way to <strong>{email}</strong>. Save your
          contestant ID — every file you submit is tied to it.
        </p>

        <div className="mx-auto mt-7 max-w-xs">
          <p className="label-eyebrow">Your contestant ID</p>
          <button
            type="button"
            onClick={copyId}
            className="bg-amber-500/12 mt-2 flex w-full items-center justify-center gap-3 rounded-xl border border-amber-400/40 px-5 py-4 transition hover:bg-amber-500/20"
          >
            <span className="font-mono text-2xl font-bold tracking-[0.12em]">
              {contestantId}
            </span>
            {copied ? (
              <CheckCircle2 className="size-4 text-emerald-400" />
            ) : (
              <Copy className="size-4 text-muted-foreground" />
            )}
          </button>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">
              Sign in to your dashboard
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/">Back to the arena</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Sign in with the email and password you just chose.
        </p>
      </CardContent>
    </Card>
  );
}
