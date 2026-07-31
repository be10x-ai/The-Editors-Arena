import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex w-full gap-3 rounded-xl border p-4 text-sm [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/[0.04] text-foreground [&>svg]:text-primary",
        info: "border-sky-500/25 bg-sky-500/10 text-sky-100 [&>svg]:text-sky-300",
        success:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-100 [&>svg]:text-emerald-300",
        // Orange rather than amber — see badge.tsx.
        warning:
          "border-orange-500/30 bg-orange-500/10 text-orange-100 [&>svg]:text-orange-300",
        destructive:
          "border-rose-500/25 bg-rose-500/10 text-rose-100 [&>svg]:text-rose-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed opacity-90", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
