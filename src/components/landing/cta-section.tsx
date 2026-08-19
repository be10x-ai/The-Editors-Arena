import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";
import { CAMPAIGN } from "@/lib/constants";
import { formatIST, formatInr } from "@/lib/utils";

export function CtaSection({
  registrationOpen,
  registrationClosesAt,
}: {
  registrationOpen: boolean;
  registrationClosesAt: Date;
}) {
  return (
    <section className="relative py-12 sm:py-16">
      <div className="container">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(22,104,255,0.26),transparent_70%)]"
            />
            <h2>
              <span className="type-chrome block text-2xl leading-tight sm:text-3xl">
                Show us
              </span>
              <span className="type-arena mt-2 block pb-1 text-[2.3rem] leading-[1] sm:text-6xl">
                What You&apos;ve Got
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {registrationOpen ? (
                <>
                  Two minutes, one portfolio link, and{" "}
                  <span className="font-semibold text-amber-300">no entry fee</span> —
                  worth {formatInr(CAMPAIGN.entryFeeInr)}, free for this edition.
                  Registration closes {formatIST(registrationClosesAt)} IST, and your
                  entry sends {formatInr(CAMPAIGN.donationPerRegistrationInr)} to{" "}
                  {CAMPAIGN.cause.longName}.
                </>
              ) : (
                "Registration for this edition has closed. Sign in to your dashboard for the latest."
              )}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {registrationOpen ? (
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/register">
                    Register Free
                    <ArrowRight />
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <Link href="/leaderboard">View the leaderboard</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
