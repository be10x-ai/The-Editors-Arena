import type { Prize } from "@prisma/client";
import { Award, Crown, Gift, Medal, Trophy } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { Card } from "@/components/ui/card";
import { PODIUM_SIZE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS = {
  trophy: Trophy,
  crown: Crown,
  medal: Medal,
  award: Award,
  gift: Gift,
} as const;

function iconFor(name: string) {
  return ICONS[name as keyof typeof ICONS] ?? Trophy;
}

/**
 * Rank label above each prize. Positions inside the podium are named; anything
 * beyond it (e.g. the every-participant scorecard) is not a rank, so it falls
 * back to its own title rather than claiming "Rank 5".
 */
function rankLabel(prize: Prize): string {
  if (prize.position > PODIUM_SIZE) return "Every participant";
  if (prize.position === 1) return "Champion";
  const suffix = prize.quantity > 1 ? ` × ${prize.quantity}` : "";
  if (prize.position === 2) return `Runner-up${suffix}`;
  return `Rank ${prize.position}${suffix}`;
}

export function PrizeSection({ prizes }: { prizes: Prize[] }) {
  if (prizes.length === 0) return null;

  return (
    <section id="prizes" className="relative scroll-mt-24 py-12 sm:py-16">
      <div aria-hidden className="aurora absolute inset-0 -z-10 opacity-60" />

      <div className="container">
        <SectionHeading
          eyebrow="Prizes"
          title="What the podium"
          accent="Takes Home"
          align="center"
          description="Prizes are the smallest part of this. The scorecard, the portfolio piece and the hiring conversation are the reason to enter."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {prizes.map((prize, index) => {
            const Icon = iconFor(prize.icon);
            const isWinner = prize.position === 1;

            return (
              <Reveal
                key={prize.id}
                delay={index * 0.08}
                className={cn(isWinner && "sm:col-span-2 lg:col-span-4")}
              >
                <Card
                  className={cn(
                    "glass-hover relative h-full overflow-hidden p-7",
                    isWinner &&
                      "border-amber-400/25 bg-gradient-to-br from-amber-500/[0.08] via-white/[0.02] to-transparent lg:flex lg:items-center lg:gap-8 lg:p-9",
                  )}
                >
                  {isWinner ? (
                    <div
                      aria-hidden
                      className="absolute -right-16 -top-16 size-52 rounded-full bg-amber-400/10 blur-3xl"
                    />
                  ) : null}

                  <span
                    className={cn(
                      "relative grid size-14 shrink-0 place-items-center rounded-2xl",
                      isWinner
                        ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-xl shadow-amber-950/40"
                        : "bg-gradient-to-br from-amber-500/25 to-slate-400/15 text-amber-200",
                    )}
                  >
                    <Icon className="size-7" />
                  </span>

                  <div className={cn("relative", isWinner ? "mt-5 lg:mt-0" : "mt-5")}>
                    <p className={cn("label-eyebrow", isWinner && "text-amber-300/80")}>
                      {rankLabel(prize)}
                    </p>
                    <h3
                      className={cn(
                        "mt-2 font-display font-bold tracking-tight",
                        isWinner ? "text-3xl sm:text-4xl" : "text-xl",
                      )}
                    >
                      {prize.reward}
                    </h3>
                    <p className="mt-1.5 text-sm font-medium text-foreground/80">
                      {prize.title}
                    </p>
                    {prize.description ? (
                      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                        {prize.description}
                      </p>
                    ) : null}
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
