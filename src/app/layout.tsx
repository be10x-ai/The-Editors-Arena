import type { Metadata, Viewport } from "next";
import { Barlow, Chakra_Petch } from "next/font/google";
import { Toaster } from "sonner";

import { BRAND } from "@/lib/constants";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

import "./globals.css";

/**
 * Type is taken from the mark itself: the wordmark is a squared geometric with
 * clipped corners, so both faces here are squared geometrics rather than the
 * humanist pair they replace.
 *
 * Barlow carries body copy — slightly condensed, low-contrast, and it holds up
 * at the 11–13px the stat labels and form hints run at.
 */
const sans = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Chakra Petch is the display face: the notched, angle-cut terminals are the
 * same move the logo's E and R make, so headings read as the mark set in text.
 *
 * It also retires Road Rage, the brush face the old gold crest used, which was
 * licensed for personal use only and had no business on a commercial hiring
 * platform. The struck-hit treatment it carried is now `.type-arena` in CSS —
 * gradient and glow rather than torn brush edges.
 */
const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
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
          "min-h-dvh bg-background font-sans text-foreground",
        )}
      >
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
