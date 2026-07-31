import type { TimelineEvent } from "@prisma/client";
import { CheckCircle2, Circle } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { formatIST } from "@/lib/utils";

export function TimelineSection({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;
  const now = Date.now();

  return (
    <section id="timeline" className="relative scroll-mt-24 py-12 sm:py-16">
      <div className="container">
        <SectionHeading
          eyebrow="Event timeline"
          title="Every date, published"
          accent="Up Front"
          description="All times are IST. If any date moves, this page and your dashboard update together — there is no second source of truth."
        />

        <ol className="mt-12 space-y-1">
          {events.map((event, index) => {
            const done = event.occursAt.getTime() <= now;
            const isNext =
              !done && events.slice(0, index).every((e) => e.occursAt.getTime() <= now);

            return (
              <Reveal key={event.id} delay={Math.min(index * 0.05, 0.4)}>
                <li className="relative flex gap-5 pb-8 last:pb-0">
                  {index < events.length - 1 ? (
                    <span
                      aria-hidden
                      className={`absolute left-[15px] top-9 h-[calc(100%-1.5rem)] w-px ${
                        done ? "bg-slate-400/40" : "bg-white/10"
                      }`}
                    />
                  ) : null}

                  <span
                    className={`relative z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border ${
                      done
                        ? "border-slate-400/40 bg-slate-400/15 text-slate-200"
                        : isNext
                          ? "border-amber-400/55 bg-amber-500/20 text-amber-200 shadow-[0_0_18px_-6px_rgba(240,178,19,0.7)]"
                          : "border-white/12 bg-white/[0.03] text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Circle className="size-3.5" />
                    )}
                  </span>

                  <div
                    className={`min-w-0 flex-1 rounded-2xl border p-5 transition ${
                      isNext
                        ? "border-amber-500/25 bg-amber-500/[0.05]"
                        : "border-white/[0.07] bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="font-display text-base font-semibold sm:text-lg">
                        {event.title}
                      </h3>
                      <p className="text-xs font-medium tabular-nums text-muted-foreground">
                        {formatIST(event.occursAt)} IST
                      </p>
                    </div>
                    {event.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {event.description}
                      </p>
                    ) : null}
                    {isNext ? (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-amber-300">
                        Up next
                      </p>
                    ) : null}
                  </div>
                </li>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
