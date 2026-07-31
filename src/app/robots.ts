import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/register", "/login", "/leaderboard"],
        // Participant, judge and admin areas are behind auth; keep them out of
        // the index so crawlers don't generate noise on protected routes.
        disallow: ["/dashboard", "/judge", "/admin", "/api"],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
