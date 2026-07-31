import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const ROLE_PREFIXES: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/judge", roles: ["JUDGE", "ADMIN"] },
  { prefix: "/dashboard", roles: ["CONTESTANT", "ADMIN"] },
];

function homeFor(role?: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "JUDGE") return "/judge";
  return "/dashboard";
}

/**
 * Edge gate. This is defence in depth only — every page and server action
 * re-checks the session server-side via `requireRole`/`assertRole`, because
 * middleware can be bypassed by a direct server-action POST.
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const rule = ROLE_PREFIXES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!rule) return NextResponse.next();

  const user = req.auth?.user;

  if (!user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!rule.roles.includes(user.role)) {
    return NextResponse.redirect(new URL(homeFor(user.role), req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/judge/:path*", "/dashboard/:path*"],
};
