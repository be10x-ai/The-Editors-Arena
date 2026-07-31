import { FileQuestion, Home } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/[0.06] text-amber-300">
          <FileQuestion className="size-7" />
        </span>
        <p className="label-eyebrow mt-6">404</p>
        <h1 className="heading-hero mt-2 text-2xl">This page doesn&apos;t exist</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The link may be out of date, or you may not have access to this area.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">
              <Home />
              Back to the arena
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
