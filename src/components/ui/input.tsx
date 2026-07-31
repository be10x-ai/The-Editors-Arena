import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-foreground transition-colors",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-primary/60 focus-visible:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive/70 aria-[invalid=true]:ring-destructive/20",
        "file:mr-3 file:rounded-md file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
