import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[110px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-foreground transition-colors",
      "placeholder:text-muted-foreground/70",
      "focus-visible:border-primary/60 focus-visible:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-[invalid=true]:border-destructive/70",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
