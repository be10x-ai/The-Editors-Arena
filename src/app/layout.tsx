import type { Metadata, Viewport } from "next";
import { Inter, Kanit, Orbitron, Sora } from "next/font/google";
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
 * bundled here. Orbitron (wide, squared, 900) and Kanit 900 Italic (heavy,
 * leaning) stand in — they carry the same proportions, so the metal and gold
 * treatments in globals.css read correctly either way.
 *
 * To switch to the licensed faces: drop the woff2 files in `public/fonts/`,
 * swap these two `next/font/google` calls for `next/font/local`, and keep the
 * `--font-chrome` / `--font-brush` variable names. Nothing else changes.
 */
const chrome = Orbitron({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-chrome",
  display: "swap",
});

const brush = Kanit({
  subsets: ["latin"],
  weight: ["900"],
  style: ["italic"],
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
    "The Editor Arena is India's video editing hackathon: real client footage, real deadlines, a published rubric, and a hiring track for the editors who win.",
  keywords: [
    "video editing hackathon",
    "video editor jobs India",
    "editing competition",
    "Premiere Pro challenge",
    "The Editor Arena",
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
