import Link from "next/link";

import { BRAND } from "@/lib/constants";

/**
 * Replaces the old multi-column footer.
 *
 * A conversion page should not offer a menu of exits at the bottom, so this
 * keeps only the copyright and a reachable support address.
 *
 * The footage licence and the entrant's ownership of their own edit used to be
 * stated here and have been removed at the client's request. Those terms still
 * need to live somewhere a participant can read before entering — the rulebook
 * or a terms page is the right home for them.
 */
export function LegalStrip() {
  return (
    <footer className="relative border-t border-white/10 py-8">
      <div aria-hidden className="filmstrip absolute inset-x-0 -top-px" />
      <div className="container flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <p>
          © {new Date().getFullYear()} {BRAND.organiser}. All rights reserved.
        </p>
        <p>
          <Link
            href={`mailto:${BRAND.supportEmail}`}
            className="underline decoration-white/25 underline-offset-4 transition-colors hover:text-foreground"
          >
            {BRAND.supportEmail}
          </Link>
        </p>
      </div>
    </footer>
  );
}
