"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-300">
          <AlertTriangle className="size-7" />
        </span>
        <h1 className="heading-hero mt-6 text-2xl">Something broke</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          An unexpected error stopped this page from rendering. Trying again usually
          works; if it doesn&apos;t, tell the organisers what you were doing.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>
            <RefreshCw />
            Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">
              <Home />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
