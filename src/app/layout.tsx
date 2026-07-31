import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";

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
 * "ARENA" is set in Road Rage, the face the crest itself uses, self-hosted from
 * `public/fonts` so there is no third-party request at runtime.
 *
 * LICENCE OUTSTANDING: Road Rage is free for personal use only (Youssef
 * Habchi). This is a commercial recruitment platform. See
 * `public/fonts/README.md`.
 *
 * The setup line above it is just Sora bold — see `.type-chrome` in globals.css.
 */
const brush = localFont({
  src: "../../public/fonts/road-rage.woff2",
  variable: "--font-brush",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: `${BRAND.name} · ${BRAND.tagline}`,
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
    title: `${BRAND.name} · ${BRAND.tagline}`,
    description:
      "Real footage. Real deadlines. Real editing talent. Compete, get scored by a named jury, and get hired.",
    url: env.appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} · ${BRAND.tagline}`,
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
          brush.variable,
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
