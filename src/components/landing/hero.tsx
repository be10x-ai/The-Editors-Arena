import { ArrowRight, Film, Sparkles, Trophy, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CountdownTimer } from "@/components/landing/countdown-timer";
import { DustMotes } from "@/components/landing/dust-motes";
import { Reveal } from "@/components/landing/reveal";
import { LogoMark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import type { Gates } from "@/lib/hackathon";
import { formatIST, formatISTDate } from "@/lib/utils";

export function Hero({
  gates,
  countdown,
  startsAt,
  registrationsCount,
  prizeHeadline,
}: {
  gates: Gates;
  countdown: { target: Date; label: string; reachedLabel: string };
  startsAt: Date;
  registrationsCount: number;
  prizeHeadline: string;
}) {
  return (
    <section className="relative isolate overflow-hidden pb-12 pt-24 sm:pb-16 sm:pt-28">
      {/* Arena backdrop. Anchored to the top at its own aspect rather than
          stretched over the whole section: the hero is far taller than the
          artwork, and object-cover across that height would crop the wreckage
          framing out entirely. It fades to page black before the countdown. */}
      <div
        aria-hidden
        /* `isolate` keeps the beam's screen blend inside this box — without it
           the blend reaches the page backdrop and washes the hero content. */
        className="absolute inset-x-0 top-0 isolate -z-10 h-[clamp(34rem,88vh,62rem)] overflow-hidden"
      >
        {/* Wrapper carries the drift so the scrims below stay put — animating
            the image and its overlays together would slide the vignette off. */}
        <div className="ken-burns absolute inset-0">
          <Image
            src="/hero-bg.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_42%]"
          />
        </div>

        <div aria-hidden className="beam-breathe absolute inset-0" />

        <DustMotes className="absolute inset-0 size-full" />

        {/* Pull the middle down so the wordmark keeps its contrast over the
            floor detail, without flattening the gold shaft at the right. */}
        <div className="absolute inset-0 bg-[radial-gradient(68%_60%_at_50%_44%,rgba(10,10,9,0.84),rgba(10,10,9,0.42)_58%,transparent_100%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      <div className="container relative z-10 flex flex-col items-center text-center">
        {/* The crest, plate dropped out so the metal floats on the page. */}
        <Reveal delay={0.04}>
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
              {gates.registrationNotYetOpen
                ? `Registration opens ${formatIST(gates.registrationOpensAt)} IST.`
                : "Registration is closed for this edition."}
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
