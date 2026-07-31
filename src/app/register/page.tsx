import { Clock, ShieldCheck, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoLockup } from "@/components/shared/logo";
import { RegistrationForm } from "@/components/forms/registration-form";
import { CountdownTimer } from "@/components/landing/countdown-timer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { BRAND } from "@/lib/constants";
import { computeGates, getActiveHackathon } from "@/lib/hackathon";
import { homeFor } from "@/lib/rbac";
import { formatIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Register for The Editor Arena — India's video editing hackathon. Real client footage, a published rubric, and a hiring track.",
};

export default async function RegisterPage() {
  const session = await auth();
  // A signed-in contestant has already registered; send them where they can act.
  if (session?.user) redirect(homeFor(session.user.role));

  const hackathon = await getActiveHackathon();
  const gates = hackathon ? computeGates(hackathon) : null;

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="aurora absolute inset-x-0 top-0 h-96" />
      <div aria-hidden className="grid-backdrop absolute inset-0 -z-10" />

      <header className="relative z-10 border-b border-white/10">
        <div className="container flex h-16 items-center justify-between">
          <LogoLockup size={42} priority />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Already registered? Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="container relative z-10 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
          <div>
            <p className="label-eyebrow">Registration</p>
            <h1 className="heading-hero mt-3 text-3xl sm:text-4xl">
              Enter <span className="text-gradient">The Editor Arena</span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {BRAND.tagline}. Two minutes to register, one portfolio link, and
              you&apos;re in the running.
            </p>

            {hackathon ? (
              <>
                <div className="mt-8">
                  <CountdownTimer
                    target={hackathon.startsAt}
                    label="Hackathon begins in"
                    reachedLabel="Hackathon Started"
                    compact
                  />
                </div>

                <dl className="mt-8 space-y-4">
                  {[
                    {
                      icon: Clock,
                      label: "Registration closes",
                      value: `${formatIST(hackathon.registrationClosesAt)} IST`,
                    },
                    {
                      icon: Trophy,
                      label: "Event day",
                      value: `${formatIST(hackathon.startsAt)} IST`,
                    },
                    {
                      icon: ShieldCheck,
                      label: "Submission deadline",
                      value: `${formatIST(hackathon.submissionDeadline)} IST`,
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-3">
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-amber-300">
                        <item.icon className="size-4" />
                      </span>
                      <div>
                        <dt className="text-xs text-muted-foreground">{item.label}</dt>
                        <dd className="text-sm font-semibold">{item.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}
          </div>

          <Card className="h-fit">
            <CardContent className="p-6 sm:p-8">
              {!hackathon ? (
                <Alert variant="warning">
                  <ShieldCheck />
                  <div>
                    <AlertTitle>Registration is not open yet</AlertTitle>
                    <AlertDescription>
                      No active edition is configured. Check back shortly, or write to{" "}
                      {BRAND.supportEmail}.
                    </AlertDescription>
                  </div>
                </Alert>
              ) : !gates?.registrationOpen ? (
                <div className="space-y-5">
                  <Alert variant="warning">
                    <Clock />
                    <div>
                      <AlertTitle>
                        {gates?.hasStarted
                          ? "The hackathon has already started"
                          : "Registration has closed"}
                      </AlertTitle>
                      <AlertDescription>
                        {gates?.hasStarted
                          ? "Entries closed when the event went live. Sign in if you already registered."
                          : `Registration closed at ${formatIST(hackathon.registrationClosesAt)} IST. Follow us for the next edition.`}
                      </AlertDescription>
                    </div>
                  </Alert>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild>
                      <Link href="/login">Sign in</Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href="/leaderboard">View leaderboard</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <RegistrationForm />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
