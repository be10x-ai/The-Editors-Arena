import { ArrowRight, Film, Sparkles, Trophy, Users } from "lucide-react";
import Link from "next/link";

import { CountdownTimer } from "@/components/landing/countdown-timer";
import { Reveal } from "@/components/landing/reveal";
import { LogoMark } from "@/components/shared/logo";
import { EventStatusBadge } from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import type { Gates } from "@/lib/hackathon";
import { formatISTDate } from "@/lib/utils";
import type { EventStatus } from "@prisma/client";

export function Hero({
  status,
  gates,
  countdown,
  startsAt,
  registrationsCount,
  prizeHeadline,
}: {
  status: EventStatus;
  gates: Gates;
  countdown: { target: Date; label: string; reachedLabel: string };
  startsAt: Date;
  registrationsCount: number;
  prizeHeadline: string;
}) {
  return (
    <section className="aurora relative isolate overflow-hidden pb-20 pt-24 sm:pb-28 sm:pt-28">
      <div aria-hidden className="grid-backdrop absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent"
      />

      <div className="container relative z-10 flex flex-col items-center text-center">
        <Reveal className="flex flex-wrap items-center justify-center gap-3">
          <EventStatusBadge status={status} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            {BRAND.organiser}
          </span>
        </Reveal>

        {/* The crest, plate dropped out so the metal floats on the page. */}
        <Reveal delay={0.04} className="mt-6">
          <LogoMark
            variant="bare"
            size={340}
            priority
            className="h-auto w-[15rem] motion-safe:animate-float sm:w-[19rem] lg:w-[21rem]"
          />
        </Reveal>

        {/* Both crest treatments, carrying the proposition rather than
            repeating the wordmark already stamped on the shield. */}
        <Reveal delay={0.1}>
          <h1 className="mt-2">
            <span className="sr-only">
              {BRAND.name} — {BRAND.themeLine}
            </span>
            <span
              aria-hidden
              className="type-chrome block text-[1.55rem] leading-[1.15] sm:text-[2.4rem] lg:text-[3rem]"
            >
              REAL FOOTAGE. REAL DEADLINES.
            </span>
            <span
              aria-hidden
              className="type-arena mt-3 block pb-2 text-[2.4rem] leading-[1] sm:mt-4 sm:text-6xl lg:text-[5rem]"
            >
              Real Editing Talent
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {BRAND.tagline}. One day, real client footage, a published rubric, and a
            named jury — then a hiring track for the editors who prove it.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            {gates.registrationOpen ? (
              <Button asChild size="lg">
                <Link href="/register">
                  Register Now
                  <ArrowRight />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Sign in to your dashboard</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="secondary">
              <Link href="#about">View Details</Link>
            </Button>
          </div>
          {!gates.registrationOpen && !gates.hasStarted ? (
            <p className="mt-3 text-sm text-orange-300/90">
              Registration is closed for this edition.
            </p>
          ) : null}
        </Reveal>

        <Reveal delay={0.25} className="mt-14 w-full">
          <CountdownTimer
            target={countdown.target}
            label={countdown.label}
            reachedLabel={countdown.reachedLabel}
          />
        </Reveal>

        <Reveal delay={0.3} className="w-full">
          <div aria-hidden className="filmstrip mt-14" />
          <dl className="mt-8 grid grid-cols-2 gap-4 text-left sm:grid-cols-4">
            {[
              {
                icon: Users,
                label: "Editors registered",
                value: `${registrationsCount}`,
              },
              { icon: Film, label: "Event day", value: formatISTDate(startsAt) },
              { icon: Trophy, label: "Top prize", value: prizeHeadline },
              { icon: Sparkles, label: "Format", value: "Online · India-wide" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/[0.12] text-primary ring-1 ring-inset ring-primary/20">
                  <stat.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <dd className="font-display text-base font-semibold leading-tight">
                    {stat.value}
                  </dd>
                  <dt className="mt-0.5 text-xs text-muted-foreground">{stat.label}</dt>
                </div>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
