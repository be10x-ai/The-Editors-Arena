"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { CAMPAIGN } from "@/lib/constants";
import { cn, formatInr } from "@/lib/utils";

/**
 * Phone-only sticky register bar.
 *
 * On a phone the hero CTA scrolls out of reach within one swipe and the next
 * one is thousands of pixels down the page. Appears once the hero is behind
 * the reader, so it never covers the primary button it duplicates.
 */
export function StickyCta({ registrationOpen }: { registrationOpen: boolean }) {
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (!registrationOpen) return;
    const onScroll = () => setShown(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [registrationOpen]);

  if (!registrationOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0a09]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-transform duration-300 sm:hidden",
        shown ? "translate-y-0" : "translate-y-full",
      )}
      // Inert while off-screen, so a hidden button is never focusable.
      aria-hidden={!shown}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold leading-tight">
            <span className="text-muted-foreground line-through">
              {formatInr(CAMPAIGN.entryFeeInr)}
            </span>{" "}
            <span className="text-amber-300">Free entry</span>
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            Closes tonight · {formatInr(CAMPAIGN.donationPerRegistrationInr)} to{" "}
            {CAMPAIGN.cause.name}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0" tabIndex={shown ? 0 : -1}>
          <Link href="/register">
            Register
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
