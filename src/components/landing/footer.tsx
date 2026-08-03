import Link from "next/link";

import { LogoLockup } from "@/components/shared/logo";
import { BRAND } from "@/lib/constants";

const COLUMNS = [
  {
    title: "Hackathon",
    links: [
      { href: "#about", label: "About" },
      { href: "#timeline", label: "Timeline" },
      { href: "#prizes", label: "Prizes" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Participate",
    links: [
      { href: "/register", label: "Register" },
      { href: "/login", label: "Sign in" },
      { href: "/dashboard", label: "My dashboard" },
      { href: "/leaderboard", label: "Leaderboard" },
    ],
  },
  {
    title: "Organisers",
    links: [
      { href: `mailto:${BRAND.supportEmail}`, label: "Contact support" },
      { href: "/judge", label: "Judge portal" },
      { href: "/admin", label: "Admin" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 py-14">
      <div aria-hidden className="filmstrip absolute inset-x-0 -top-px" />
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <LogoLockup size={44} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {BRAND.themeLine} An initiative by {BRAND.organiser} to find and hire the
              next generation of video editors in India.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="label-eyebrow">{column.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.organiser}. All rights reserved.
          </p>
          {/*
            Two separate rights, and conflating them gave away the footage: the
            source clips stay the organiser's and are only lent for the event,
            while the entrant owns their editorial work. A submission embeds
            both, so neither side can exploit it without the other's licence.
          */}
          <p>
            Source footage remains the property of {BRAND.organiser}, licensed to
            entrants for this hackathon only. Your edit stays yours and is always
            credited; entering grants us a licence to showcase it.
          </p>
        </div>
      </div>
    </footer>
  );
}
