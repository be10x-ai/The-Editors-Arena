import { ArrowRight, Briefcase, TicketPercent, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CountdownTimer } from "@/components/landing/countdown-timer";
import { Reveal } from "@/components/landing/reveal";
import { AiToolStrip, ToolStrip } from "@/components/landing/tool-logos";
import { Button } from "@/components/ui/button";
import { BRAND, CAMPAIGN } from "@/lib/constants";
import type { Gates, PublicCountdown } from "@/lib/hackathon";
import { formatIST, formatISTDate, formatInr } from "@/lib/utils";

/**
 * Two columns from `lg` up: the offer on the left, the work on the right.
 *
 * The left column carries exactly four things, in the order a visitor decides
 * on them — the prize, that it comes with a job, that it costs nothing today,
 * and how long that lasts. The right column is what the day actually looks
 * like, so the page shows the craft rather than describing it.
 *
 * Below `lg` the two stack and the column centres, because a half-width layout
 * at 5rem type has nowhere to go on a phone.
 */
export function Hero({
  gates,
  countdown,
  startsAt,
  registrationsCount,
  prizeHeadline,
  prizePoolLabel,
}: {
  gates: Gates;
  countdown: PublicCountdown;
  startsAt: Date;
  registrationsCount: number;
  prizeHeadline: string;
  /** Podium total, e.g. "₹1.8 Lakh". Empty when the rewards aren't numeric. */
  prizePoolLabel: string;
}) {
  const donated = registrationsCount * CAMPAIGN.donationPerRegistrationInr;

  const rail = [
    {
      key: "prize",
      icon: Trophy,
      tone: "text-sky-300",
      body: (
        <>
          <span className="font-semibold text-foreground">
            {prizePoolLabel || prizeHeadline}
          </span>{" "}
          prize pool
        </>
      ),
    },
    {
      key: "job",
      icon: Briefcase,
      tone: "text-blue-300",
      body: (
        <>
          <span className="font-semibold text-foreground">Full-time role</span> after a
          paid trial
        </>
      ),
    },
    {
      key: "free",
      icon: TicketPercent,
      tone: "text-amber-300",
      body: (
        <>
          <span className="text-muted-foreground/70 line-through decoration-rose-400/70 decoration-2">
            {formatInr(CAMPAIGN.entryFeeInr)}
          </span>{" "}
          <span className="font-semibold text-amber-300">FREE</span> today
        </>
      ),
    },
  ];

  return (
    <section className="relative isolate overflow-hidden pb-14 pt-28 sm:pb-20 sm:pt-32">
      {/* Drawn backdrop: navy plate, a blue wash rising behind the prize, and a
          technical grid. No image requests at all. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(62%_58%_at_28%_8%,rgba(22,104,255,0.28),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(48%_44%_at_82%_62%,rgba(79,168,255,0.16),transparent_74%)]" />
        <div className="grid-backdrop absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.06fr] lg:gap-10 xl:gap-14">
          {/* ------------------------- The offer ------------------------- */}
          <div className="text-center lg:text-left">
            <Reveal delay={0.04}>
              <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-display text-sm font-bold uppercase tracking-[0.16em] text-foreground sm:text-base sm:tracking-[0.2em] lg:justify-start">
                <span
                  aria-hidden
                  className="hidden h-px w-8 bg-gradient-to-r from-transparent to-primary sm:block sm:w-12 lg:from-primary lg:to-primary"
                />
                {BRAND.tagline}
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-5">
                <span className="sr-only">
                  Video editors: win {prizeHeadline} and a full-time video editing job —{" "}
                  {BRAND.name}
                </span>
                <span
                  aria-hidden
                  className="type-chrome block text-[1.5rem] font-bold uppercase leading-none tracking-[0.3em] text-sky-200 sm:text-[2rem] lg:text-[2.2rem]"
                >
                  Win
                </span>
                <span
                  aria-hidden
                  className="type-arena mt-1 block pb-2 text-[3.1rem] leading-[0.98] sm:text-[5rem] lg:text-[4.6rem] xl:text-[5.6rem]"
                >
                  {prizeHeadline}
                </span>
                <span
                  aria-hidden
                  className="type-chrome mt-1 block text-[1.35rem] leading-[1.15] sm:text-[2rem] lg:text-[1.9rem] xl:text-[2.25rem]"
                >
                  AND A FULL-TIME VIDEO EDITING JOB
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0">
                <span className="font-semibold text-foreground">
                  For video editors across India.
                </span>{" "}
                One day — {formatISTDate(startsAt)}, online. You get real client footage
                and a brief, six hours to cut it, a rubric published before you start,
                and a named jury who actually watches your edit.
              </p>
            </Reveal>

          </div>

          {/* ------------------------- The work -------------------------- */}
          <Reveal delay={0.18} y={32}>
            <div className="relative">
              {/* A soft pool of light under the artwork so it sits on the page
                  rather than floating as a cut-out. */}
              <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-[radial-gradient(58%_54%_at_52%_52%,rgba(22,104,255,0.28),transparent_72%)]"
              />
              <Image
                src="/hero-editor.png"
                alt="A video editor at work — timeline, colour wheels, audio waveform and film footage"
                width={1500}
                height={836}
                priority
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="mx-auto h-auto w-full max-w-2xl lg:max-w-none"
              />
            </div>
          </Reveal>
        </div>

        {/* The three facts, spread across the full page width so they read as
            the terms of the offer rather than as a caption to the headline. */}
        <Reveal delay={0.22} className="mt-10 lg:mt-6">
          <ul className="grid gap-3 sm:grid-cols-3">
            {rail.map((item) => (
              <li
                key={item.key}
                className="glass flex items-center justify-center gap-3.5 rounded-2xl px-5 py-6 text-lg sm:text-xl lg:justify-start lg:px-7 lg:py-7"
              >
                <item.icon className={`size-8 shrink-0 ${item.tone}`} />
                <span className="text-muted-foreground">{item.body}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* The deadline and the two buttons, given the full width of the page.
            Boxed into the left column they left a dead quarter under the
            artwork; across the page they close the fold instead. */}
        <Reveal delay={0.26} className="mt-10 lg:mt-4">
          <div className="glass rounded-3xl p-5 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
              <div className="lg:min-w-0 lg:flex-1">
                <CountdownTimer
                  fluid
                  // The deadline is the whole reason the timer is here, so the
                  // line naming it is set as a heading rather than an eyebrow.
                  labelClassName="mb-4 font-display text-lg font-bold tracking-[0.14em] text-sky-200 sm:text-xl sm:tracking-[0.16em]"
                  target={countdown.target}
                  label={countdown.label}
                  reachedLabel={countdown.reachedLabel}
                  rollDailyUntil={countdown.rollDailyUntil}
                />
              </div>

              <div className="lg:w-px lg:self-stretch lg:bg-white/10" aria-hidden />

              <div className="lg:w-[19rem] lg:shrink-0 xl:w-[24rem]">
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  {gates.registrationOpen ? (
                    <Button asChild size="lg" className="w-full">
                      <Link href="/register">
                        Register Free
                        <ArrowRight />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="lg" variant="secondary" className="w-full">
                      <Link href="/login">Sign in to your dashboard</Link>
                    </Button>
                  )}
                  <Button asChild size="lg" variant="secondary" className="w-full">
                    <Link href="#hiring">See the hiring track</Link>
                  </Button>
                </div>

                {gates.registrationOpen ? (
                  <p className="mt-3 text-center text-xs text-muted-foreground lg:text-left">
                    Two minutes and one portfolio link · {registrationsCount} registered ·{" "}
                    {formatInr(donated)} donated
                  </p>
                ) : null}
                {!gates.registrationOpen && !gates.hasStarted ? (
                  <p className="mt-3 text-center text-sm text-orange-300/90 lg:text-left">
                    {gates.registrationNotYetOpen
                      ? `Registration opens ${formatIST(gates.registrationOpensAt)} IST.`
                      : "Registration is closed for this edition."}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </Reveal>

        {/* The toolchain, stated as permission rather than requirement — first
            the NLEs, then the generative tools the rulebook whitelists. */}
        <Reveal delay={0.3} className="mt-16">
          <div aria-hidden className="filmstrip" />
          <p className="mt-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Cut it in whatever you already own
          </p>
          <ToolStrip className="mt-5" />

          <p className="mt-10 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            AI tools on the whitelist
          </p>
          <AiToolStrip className="mt-5" />
        </Reveal>
      </div>
    </section>
  );
}
