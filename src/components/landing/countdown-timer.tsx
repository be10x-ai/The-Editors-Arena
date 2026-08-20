"use client";

import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";

import { cn, endOfISTDay } from "@/lib/utils";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function diff(targetMs: number): Remaining | null {
  const delta = targetMs - Date.now();
  if (delta <= 0) return null;
  return {
    days: Math.floor(delta / 86_400_000),
    hours: Math.floor((delta / 3_600_000) % 24),
    minutes: Math.floor((delta / 60_000) % 60),
    seconds: Math.floor((delta / 1000) % 60),
  };
}

/**
 * Live countdown. Renders nothing on the first paint beyond zeros so the
 * server and client markup match, then ticks once mounted — a countdown that
 * hydrates from server time is guaranteed to mismatch.
 */
export function CountdownTimer({
  target,
  label,
  reachedLabel,
  rollDailyUntil,
  className,
  labelClassName,
  compact = false,
  fluid = false,
}: {
  target: string | Date;
  label: string;
  reachedLabel: string;
  /**
   * Nightly cutoff mode. When the target elapses, the timer re-arms to the next
   * 23:59 IST instead of collapsing to `reachedLabel` — until this instant, the
   * real deadline, which it never rolls past.
   */
  rollDailyUntil?: string | Date;
  className?: string;
  /** Overrides the label styling — the hero sets it much louder than default. */
  labelClassName?: string;
  compact?: boolean;
  /**
   * Let the units span the full width of the parent. Off by default (the timer
   * is usually centred in a narrow column); on inside the hero band, where
   * centring a max-w-xl grid in a full-width panel left a visible dead gap to
   * its left.
   */
  fluid?: boolean;
}) {
  const targetMs = React.useMemo(
    () => (typeof target === "string" ? new Date(target) : target).getTime(),
    [target],
  );
  const rollUntilMs = React.useMemo(
    () =>
      rollDailyUntil === undefined
        ? null
        : (typeof rollDailyUntil === "string"
            ? new Date(rollDailyUntil)
            : rollDailyUntil
          ).getTime(),
    [rollDailyUntil],
  );

  const [remaining, setRemaining] = React.useState<Remaining | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    setMounted(true);

    // Held in a ref-like local so a rolled-over target survives between ticks
    // without re-running this effect (which would restart the interval).
    let current = targetMs;

    const tick = () => {
      let next = diff(current);
      if (next === null && rollUntilMs !== null && Date.now() < rollUntilMs) {
        current = Math.min(endOfISTDay(Date.now()), rollUntilMs);
        next = diff(current);
      }
      setRemaining(next);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs, rollUntilMs]);

  const reached = mounted && remaining === null;

  if (reached) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-emerald-400" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
        </span>
        <p className="font-display text-xl font-bold tracking-tight text-emerald-300 sm:text-2xl">
          {reachedLabel}
        </p>
      </div>
    );
  }

  /**
   * Seconds are flagged `live`: it is the only number on the page that moves,
   * and lighting it is what makes the panel read as a running clock rather
   * than four printed boxes. Everything else stays quiet so the lit tile has
   * something to be brighter than.
   */
  const units = [
    { value: remaining?.days ?? 0, label: "Days", live: false },
    { value: remaining?.hours ?? 0, label: "Hours", live: false },
    { value: remaining?.minutes ?? 0, label: "Minutes", live: false },
    { value: remaining?.seconds ?? 0, label: "Seconds", live: true },
  ];

  return (
    <div className={cn("w-full", className)}>
      <p className={cn("label-eyebrow mb-3", labelClassName)}>{label}</p>
      <div
        className={cn(
          "grid grid-cols-4",
          fluid ? "w-full" : "mx-auto",
          compact ? "max-w-sm gap-2" : "gap-2.5 sm:gap-4",
          !fluid && !compact && "max-w-xl",
        )}
      >
        {units.map((unit, index) => (
          <motion.div
            key={unit.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.4, ease: "easeOut" }}
            className={cn(
              "glass relative overflow-hidden rounded-xl text-center",
              compact ? "px-2 py-2.5" : "px-2 py-4 sm:px-4 sm:py-5",
              unit.live && "timer-live",
            )}
          >
            <div
              aria-hidden
              className={cn(
                "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
                unit.live ? "via-sky-300" : "via-sky-400/60",
              )}
            />
            <p
              className={cn(
                "font-display font-bold tabular-nums tracking-tight",
                compact ? "text-xl" : "text-2xl sm:text-4xl",
                unit.live ? "text-glow-sky text-sky-100" : "text-foreground",
              )}
              suppressHydrationWarning
            >
              {unit.live && !reduceMotion ? (
                /* Keyed on the value, so each tick remounts the digits and
                   replays the lift — the movement is the attraction, not a
                   loop running whether or not the clock is going. */
                <motion.span
                  key={unit.value}
                  className="inline-block"
                  initial={{ opacity: 0.35, y: -5, scale: 1.06 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  {String(unit.value).padStart(2, "0")}
                </motion.span>
              ) : (
                String(unit.value).padStart(2, "0")
              )}
            </p>
            <p
              className={cn(
                "mt-1 font-medium uppercase tracking-[0.16em]",
                compact ? "text-[9px]" : "text-[10px] sm:text-[11px]",
                unit.live ? "text-sky-300/90" : "text-muted-foreground",
              )}
            >
              {unit.label}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
