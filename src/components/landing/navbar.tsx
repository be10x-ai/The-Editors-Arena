"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { LogoLockup } from "@/components/shared/logo";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#hiring", label: "The Job" },
  { href: "#about", label: "About" },
  { href: "#timeline", label: "Timeline" },
  { href: "#prizes", label: "Prizes" },
  { href: "#cause", label: "Cause" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar({
  isAuthenticated,
  dashboardHref,
  registrationOpen,
  closedLabel,
}: {
  isAuthenticated: boolean;
  dashboardHref: string;
  registrationOpen: boolean;
  /** Shown on the disabled CTA — "Registration closed" reads wrong pre-launch. */
  closedLabel: string;
}) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile sheet is open.
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-[#0a0a09]/85 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <nav className="sm:h-18 container flex h-16 items-center justify-between gap-4">
        <LogoLockup size={44} priority onClick={() => setOpen(false)} />

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {isAuthenticated ? (
            <>
              <Button asChild size="sm">
                <Link href={dashboardHref}>My dashboard</Link>
              </Button>
              <SignOutButton />
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" disabled={!registrationOpen}>
                <Link href={registrationOpen ? "/register" : "#about"}>
                  {registrationOpen ? "Register Free" : closedLabel}
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid size-10 place-items-center rounded-lg text-foreground transition hover:bg-white/[0.08] lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open ? (
        <div className="bg-[#0a0a09]/97 border-t border-white/10 backdrop-blur-xl lg:hidden">
          <div className="container flex flex-col gap-1 py-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link href={dashboardHref}>My dashboard</Link>
                  </Button>
                  <SignOutButton className="flex justify-center" />
                </>
              ) : (
                <>
                  <Button asChild variant="secondary" onClick={() => setOpen(false)}>
                    <Link href="/login">Sign in</Link>
                  </Button>
                  {registrationOpen ? (
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link href="/register">Register Free</Link>
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
