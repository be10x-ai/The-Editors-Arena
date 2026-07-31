import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors [&_svg]:size-3",
  {
    variants: {
      variant: {
        // Brushed steel — the neutral chip. Gold is reserved for `gold`, so
        // brand emphasis never competes with the champion marker.
        default: "border-white/15 bg-steel-plate text-zinc-200",
        secondary: "border-white/10 bg-white/[0.06] text-foreground/80",
        outline: "border-border bg-transparent text-muted-foreground",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        // Orange, not amber: amber now reads as brand gold everywhere else.
        warning: "border-orange-500/35 bg-orange-500/15 text-orange-300",
        danger: "border-rose-500/30 bg-rose-500/15 text-rose-300",
        info: "border-sky-500/30 bg-sky-500/15 text-sky-300",
        gold: "border-amber-400/45 bg-gradient-to-b from-amber-400/25 to-amber-600/15 text-amber-200 shadow-[0_0_18px_-6px_rgba(240,178,19,0.6)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
