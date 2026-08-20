"use client";

import * as React from "react";

/**
 * Sends a reloaded landing page back to the top.
 *
 * Browsers restore the previous scroll offset on reload, which on a page this
 * long drops the visitor back into the middle of the timeline or the FAQ with
 * no idea where they are. Only reloads are touched: a deep link to `#prizes`
 * still lands on the section, and back/forward keep their restored position,
 * so `scrollRestoration` is put straight back to `auto` afterwards.
 */
export function ScrollToTopOnReload() {
  React.useEffect(() => {
    const [entry] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (entry?.type !== "reload" || window.location.hash) return;

    const previous = history.scrollRestoration;
    // The browser can restore after hydration, so block it rather than race it.
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const settle = () => {
      window.scrollTo(0, 0);
      history.scrollRestoration = previous ?? "auto";
    };

    if (document.readyState === "complete") {
      const id = window.setTimeout(settle, 0);
      return () => window.clearTimeout(id);
    }

    window.addEventListener("load", settle);
    return () => {
      window.removeEventListener("load", settle);
      history.scrollRestoration = previous ?? "auto";
    };
  }, []);

  return null;
}
