import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "gold" | "steel" | "emerald" | "orange" | "rose" | "neutral";
  className?: string;
}) {
  const tones = {
    gold: "text-amber-300 bg-amber-500/[0.12] ring-1 ring-inset ring-amber-400/20",
    steel: "text-slate-200 bg-slate-400/[0.12] ring-1 ring-inset ring-slate-300/15",
    emerald: "text-emerald-300 bg-emerald-500/[0.12]",
    orange: "text-orange-300 bg-orange-500/[0.12]",
    rose: "text-rose-300 bg-rose-500/[0.12]",
    neutral: "text-muted-foreground bg-white/[0.06]",
  } as const;

  return (
    <Card className={cn("glass-hover p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-eyebrow">{label}</p>
          <p className="stat-value mt-2">{value}</p>
          {hint ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              tones[tone],
            )}
          >
            <Icon className="size-5" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
