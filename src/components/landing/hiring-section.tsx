import { BadgeCheck, Briefcase, ClipboardCheck, Handshake, Users2 } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/lib/constants";

/**
 * The reason the prize money is the second-best thing on this page. Contests
 * end at the podium; this one ends at an offer letter, and that has to be
 * visible above the fold-and-a-half rather than buried in an FAQ.
 */
const STEPS = [
  {
    icon: ClipboardCheck,
    step: "01",
    title: "You submit one edit",
    body: "Six hours, real client footage, one brief. What you upload is the only thing that counts — no résumé screen, no referral, no portfolio gatekeeping.",
  },
  {
    icon: BadgeCheck,
    step: "02",
    title: "Three judges score it",
    body: "Independently, against a rubric published before you start. You get their scores and their written feedback whether you place or not.",
  },
  {
    icon: Handshake,
    step: "03",
    title: "Top performers get interviewed",
    body: "A fast-tracked hiring interview — skipping the queue that every cold application sits in.",
  },
  {
    icon: Briefcase,
    step: "04",
    title: "Paid trial, then the role",
    body: "A real project, paid at professional rates. Clear that and it becomes a full-time editing role with us.",
  },
];

export function HiringSection() {
  return (
    <section id="hiring" className="relative scroll-mt-24 py-12 sm:py-16">
      <div className="container">
        <SectionHeading
          eyebrow="The job opportunity"
          title="This is a hiring round"
          accent="Disguised as a Contest"
          description={`${BRAND.organiser} is hiring video editors. Rather than read a thousand CVs, we are watching a thousand edits — and the ones that stand up get an interview, a paid trial, and a full-time role.`}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item, index) => (
            <Reveal key={item.step} delay={index * 0.06}>
              <Card className="glass-hover relative h-full overflow-hidden p-6">
                <span
                  aria-hidden
                  className="absolute right-4 top-3 font-display text-4xl font-bold text-white/[0.05] sm:text-5xl"
                >
                  {item.step}
                </span>
                <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-sky-500/25 to-blue-500/15 text-sky-200">
                  <item.icon className="size-5" />
                </span>
                <h3 className="relative mt-4 font-display text-lg font-semibold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>

        {/* Nobody outside the podium should read the four steps above and
            conclude the event was worthless to them. */}
        <Reveal delay={0.1} className="mt-6">
          <div className="glass flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-slate-300">
                <Users2 className="size-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">
                  Didn&apos;t place? You still leave with something.
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Strong submissions outside the top three go onto our vetted freelance
                  roster — the list we hire from all year. Every valid entry gets an
                  individual scorecard and judge feedback, which is yours to use however
                  you like.
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
              <Link href="/register">Register Free</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
