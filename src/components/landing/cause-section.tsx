import { HeartHandshake } from "lucide-react";
import Image from "next/image";

import { Reveal } from "@/components/landing/reveal";
import { BRAND, CAMPAIGN } from "@/lib/constants";
import { formatInr } from "@/lib/utils";

/**
 * The cause block. Deliberately states who pays — an entrant reading "₹500 per
 * registration" next to a registration form will assume it is coming out of
 * their pocket unless we say plainly that it is not.
 */
export function CauseSection({ registrationsCount }: { registrationsCount: number }) {
  const perEntry = CAMPAIGN.donationPerRegistrationInr;
  const raised = registrationsCount * perEntry;

  return (
    <section id="cause" className="relative scroll-mt-24 py-12 sm:py-16">
      <div className="container">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-3xl p-6 sm:p-10">
            <div
              aria-hidden
              className="absolute -right-24 -top-24 size-64 rounded-full bg-emerald-400/10 blur-3xl"
            />

            <div className="relative grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-12">
              <div>
                <p className="label-eyebrow flex items-center gap-2">
                  <HeartHandshake className="size-4 text-emerald-300" />
                  Every entry counts twice
                </p>
                <h2 className="mt-3">
                  <span className="type-chrome block text-2xl leading-tight sm:text-[1.9rem] lg:text-[2.2rem]">
                    You compete. We donate
                  </span>
                  <span className="type-arena mt-2 block pb-1 text-[2.1rem] leading-[1] sm:text-5xl lg:text-[3.4rem]">
                    {formatInr(perEntry)} Per Entry
                  </span>
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  For every completed registration, {BRAND.organiser} donates{" "}
                  {formatInr(perEntry)} to {CAMPAIGN.cause.longName}. Not deducted from
                  you — entry is free, and we pay it. Registering costs you two minutes
                  and sends {formatInr(perEntry)} to a family rebuilding after the
                  floods.
                </p>
                <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground/80">
                  Total donated = registrations × {formatInr(perEntry)}. The final
                  amount and the receiving organisation are published after registration
                  closes.
                </p>
              </div>

              {/* The live ticker. It is the proof the promise is real, so it is
                  computed from the same registration count the hero shows. */}
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-6 text-center sm:p-8">
                <p className="label-eyebrow text-emerald-300/80">Raised so far</p>
                <p className="mt-3 font-display text-4xl font-bold tabular-nums tracking-tight text-emerald-300 sm:text-5xl">
                  {formatInr(raised)}
                </p>
                <div className="hairline my-5" />
                <dl className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <dd className="font-display text-lg font-semibold tabular-nums">
                      {registrationsCount}
                    </dd>
                    <dt className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      Registrations
                    </dt>
                  </div>
                  <div>
                    <dd className="font-display text-lg font-semibold tabular-nums">
                      {formatInr(perEntry)}
                    </dd>
                    <dt className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      Donated per entry
                    </dt>
                  </div>
                </dl>
                <p className="mt-5 text-xs font-medium text-emerald-200/90">
                  Your registration adds {formatInr(perEntry)} to this number.
                </p>
              </div>
            </div>

            {/* What the money is for. Photographs rather than an illustration:
                the cause is real, and a drawn stand-in would read as decoration
                next to a number we are asking people to trust. */}
            <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
              {RELIEF_PHOTOS.map((photo, index) => (
                <figure
                  key={photo.src}
                  className="relative overflow-hidden rounded-2xl border border-white/10"
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={900}
                    height={675}
                    sizes="(max-width: 640px) 100vw, 30vw"
                    loading="lazy"
                    className="h-44 w-full object-cover sm:h-40 lg:h-44"
                  />
                  {/* A cool scrim so three separately-shot photographs sit on
                      the same page as one another and as the palette. */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-[#050b16] via-[#050b16]/25 to-transparent"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 p-3 text-[11px] font-medium leading-snug text-foreground/90">
                    {photo.caption}
                  </figcaption>
                  {index === 0 ? (
                    <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur">
                      Assam, 2026
                    </span>
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Documentary photographs of the flooding the donation goes to. Captions state
 * what is shown rather than editorialising — the number above already makes the
 * argument.
 */
const RELIEF_PHOTOS = [
  {
    src: "/cause/relief-1.jpg",
    alt: "Flooding across an Assam village",
    caption: "Homes and farmland under water across the Brahmaputra valley.",
  },
  {
    src: "/cause/relief-2.jpg",
    alt: "Assam floods affecting districts across the state",
    caption: "14 districts hit; more than 27 lakh people affected.",
  },
  {
    src: "/cause/relief-3.jpg",
    alt: "Relief effort during the Assam floods",
    caption: "Relief and rebuilding is where every ₹500 goes.",
  },
];
