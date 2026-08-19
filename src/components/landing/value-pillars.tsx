import { Briefcase, TicketPercent, Trophy } from "lucide-react";

import { CAMPAIGN } from "@/lib/constants";
import { cn, formatInr } from "@/lib/utils";

/**
 * The three reasons to enter, in one place so the landing hero and the
 * registration page cannot drift apart on what was promised.
 *
 * `showPrize` exists because the hero headline already sets the prize figure at
 * 7rem — repeating it in a card directly underneath said the same thing twice.
 * The registration page has no such headline, so there it earns its place.
 */
export function ValuePillars({
  prizeHeadline,
  prizePoolLabel,
  showPrize = true,
  orientation = "row",
  className,
}: {
  prizeHeadline?: string;
  /** Podium total, e.g. "₹1.8 Lakh". Omitted when rewards aren't numeric. */
  prizePoolLabel?: string;
  showPrize?: boolean;
  /** "row" spreads across the page; "stack" runs down a sidebar. */
  orientation?: "row" | "stack";
  className?: string;
}) {
  const items = [
    showPrize && prizeHeadline
      ? {
          key: "prize",
          icon: Trophy,
          tone: "text-sky-300",
          label: "First prize",
          value: <span>{prizeHeadline}</span>,
          note: prizePoolLabel
            ? `${prizePoolLabel} across three ranks`
            : "Cash, paid to the winner",
        }
      : null,
    {
      key: "job",
      icon: Briefcase,
      tone: "text-blue-300",
      label: "Job opportunity",
      value: <span>Full-time role</span>,
      note: "Fast-tracked interview, then a paid trial",
    },
    {
      key: "free",
      icon: TicketPercent,
      // The one warm note on an otherwise entirely blue page. Amber is the
      // complement of the brand blue, so "FREE" separates from everything
      // around it without needing to be bigger than it deserves.
      tone: "text-amber-300",
      label: "Registration",
      value: (
        <>
          <span className="text-muted-foreground/70 line-through decoration-rose-400/70 decoration-2">
            {formatInr(CAMPAIGN.entryFeeInr)}
          </span>{" "}
          <span className="text-amber-300">FREE</span>
        </>
      ),
      note: "Free today — no fee, no card, ever",
    },
  ].filter(Boolean) as {
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    label: string;
    value: React.ReactNode;
    note: string;
  }[];

  return (
    <dl
      className={cn(
        "grid gap-4",
        orientation === "row" && (items.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2"),
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="glass rounded-2xl p-5 sm:p-6">
          <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <item.icon className={cn("size-4", item.tone)} />
            {item.label}
          </dt>
          <dd className="mt-3">
            <p className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-[1.75rem]">
              {item.value}
            </p>
            <p className="mt-1.5 text-xs leading-snug text-muted-foreground sm:text-[13px]">
              {item.note}
            </p>
          </dd>
        </div>
      ))}
    </dl>
  );
}
