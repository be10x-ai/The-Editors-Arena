import type { Metadata, Viewport } from "next";
import { Inter, Protest_Guerrilla, Russo_One, Sora } from "next/font/google";
import { Toaster } from "sonner";

import { CrestFilters } from "@/components/shared/crest-filters";
import { BRAND } from "@/lib/constants";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

/**
 * The crest's two voices.
 *
 * The brand spec calls for TT Supermolot ExtraBold / Ethnocentric on "EDITOR'S"
 * and Road Rage on "ARENA". All three are commercially licensed and are not
 * bundled here.
 *
 * Russo One stands in for EDITOR'S — wide, squared and heavy, the closest open
 * face to Eurostile Extended / Ethnocentric. Protest Guerrilla stands in for
 * ARENA: its outlines are genuinely torn rather than a clean italic, which is
 * what the brush lettering needs.
 *
 * Both are single-weight, so `.type-chrome` / `.type-arena` in globals.css set
 * `font-weight: 400` — synthesised bold smears these outlines. If you swap in
 * the licensed faces, raise those two weights to match.
 *
 * To switch: drop the woff2 files in `public/fonts/`, swap these two
 * `next/font/google` calls for `next/font/local`, and keep the `--font-chrome`
 * / `--font-brush` variable names. Nothing else changes.
 */
const chrome = Russo_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-chrome",
  display: "swap",
});

const brush = Protest_Guerrilla({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-brush",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    "The Editor's Arena is India's video editing hackathon: real client footage, real deadlines, a published rubric, and a hiring track for the editors who win.",
  keywords: [
    "video editing hackathon",
    "video editor jobs India",
    "editing competition",
    "Premiere Pro challenge",
    "The Editor's Arena",
  ],
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Real footage. Real deadlines. Real editing talent. Compete, get scored by a named jury, and get hired.",
    url: env.appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.themeLine,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a09",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          sans.variable,
          display.variable,
          chrome.variable,
          brush.variable,
          "min-h-dvh bg-background font-sans text-foreground",
        )}
      >
        <CrestFilters />
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "border border-white/10 bg-[#171613] text-foreground shadow-2xl backdrop-blur-xl",
              description: "text-muted-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}
