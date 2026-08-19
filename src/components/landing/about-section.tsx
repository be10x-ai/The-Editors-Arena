import {
  AudioLines,
  Briefcase,
  Clock,
  Layers,
  Palette,
  ScrollText,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { Card } from "@/components/ui/card";
import { RATING_CRITERIA } from "@/lib/constants";

const WHO = [
  {
    icon: Briefcase,
    title: "Who can participate",
    body: "Any editor in India, 18 or older — freelance, in-house, agency, or student. Individual entries only. You need your own machine, your own software licence, and a working internet connection.",
  },
  {
    icon: Clock,
    title: "Challenge format",
    body: "One day, one brief. You download real client footage from your dashboard when the event goes live, cut to the brief, and upload your final video before the deadline. There are no extensions.",
  },
  {
    icon: ScrollText,
    title: "How it's judged",
    body: "Three judges score every submission independently against a rubric published in advance. Your final score is the average of their overall marks, to two decimals.",
  },
  {
    icon: Sparkles,
    title: "Hiring opportunity",
    body: "The top performers go straight into our hiring funnel — a fast-tracked interview and a paid trial project. Every valid participant gets an individual scorecard and a place on our freelance roster shortlist.",
  },
];

const CRITERION_ICONS = {
  creativity: Wand2,
  storytelling: ScrollText,
  editingSkill: Layers,
  motionGraphics: Palette,
  soundDesign: AudioLines,
  technicalQuality: Sparkles,
} as const;

export function AboutSection() {
  return (
    <section id="about" className="relative scroll-mt-24 py-12 sm:py-16">
      <div className="container">
        <SectionHeading
          eyebrow="About the hackathon"
          title="A competition built like"
          accent="A Real Client Brief"
          description="Editors don't lack contests — they lack proof. This one gives you real footage, a real deadline, a rubric you can read before you start, and a jury that will actually watch your work."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {WHO.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <Card className="glass-hover h-full p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-sky-500/25 to-blue-500/15 text-sky-200">
                  <item.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-16">
          <div className="glass rounded-3xl p-6 sm:p-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label-eyebrow">Editing skills evaluated</p>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">
                  Six criteria, scored 0.0 – 10.0
                </h3>
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Every judge marks all six, plus a holistic overall score. Weights below
                are what we use to sanity-check a judge against their own criteria.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {RATING_CRITERIA.map((criterion, index) => {
                const Icon = CRITERION_ICONS[criterion.key];
                return (
                  <Reveal key={criterion.key} delay={index * 0.04}>
                    <div className="flex h-full gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-slate-300">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className="font-semibold">{criterion.label}</p>
                          <span className="text-xs font-medium tabular-nums text-sky-300">
                            {Math.round(criterion.weight * 100)}%
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {criterion.help}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
