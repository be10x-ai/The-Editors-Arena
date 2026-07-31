import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-white/12 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-white/[0.02] px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-xl bg-white/[0.05] text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <p className="font-display text-base font-semibold">{title}</p>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
