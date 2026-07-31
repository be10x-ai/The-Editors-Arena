"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

/**
 * Re-fetches the current server component tree on an interval.
 *
 * Event state is owned by the admin, so a contestant sitting on their dashboard
 * when the task is released would otherwise keep seeing "locked" until they
 * thought to reload — `revalidatePath` runs on the server and cannot reach
 * another person's browser, and Next caches the RSC payload client-side.
 *
 * Deliberately cheap: pauses whenever the tab is hidden, and refreshes
 * immediately on becoming visible again so returning to the tab is never stale.
 */
export function LiveRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => router.refresh(), Math.max(10, seconds) * 1000);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, seconds]);

  return null;
}
