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
    gold: "text-sky-300 bg-sky-500/[0.12] ring-1 ring-inset ring-sky-400/20",
    steel: "text-slate-200 bg-slate-400/[0.12] ring-1 ring-inset ring-slate-300/15",
    emerald: "text-emerald-300 bg-emerald-500/[0.12]",
    orange: "text-orange-300 bg-orange-500/[0.12]",
    rose: "text-rose-300 bg-rose-500/[0.12]",
    neutral: "text-muted-foreground bg-white/[0.06]",
  } as const;

  return (
    <Card className={cn("glass-hover p-5", className)}>
      {/* Only the label shares a row with the icon. The value and hint sit
          below at full width — previously all three were squeezed into one
          narrow column, so a two-word label collided with the icon and a short
          hint broke across three lines. */}
      <div className="flex items-start justify-between gap-2">
        <p className="label-eyebrow min-w-0 flex-1 break-words">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl",
              tones[tone],
            )}
          >
            <Icon className="size-[18px]" />
          </span>
        ) : null}
      </div>

      <p className="stat-value mt-2">{value}</p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-balance text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </Card>
  );
}
