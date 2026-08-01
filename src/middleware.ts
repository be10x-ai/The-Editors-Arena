import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

const PROTECTED = ["/admin", "/judge", "/dashboard"];

/**
 * Refreshes the Supabase session on every request and turns anonymous visitors
 * away from the signed-in areas.
 *
 * Two things it deliberately does not do.
 *
 * It does not check roles: that needs the `users` row, and Prisma cannot run on
 * the Edge runtime. `requireRole` already re-checks on every page and every
 * server action, which is the real guard — middleware is bypassable by a direct
 * server-action POST, so it was always defence in depth rather than the fence.
 *
 * It does not skip the refresh on unprotected routes. Supabase access tokens
 * are short-lived and the refresh must happen somewhere that can write cookies,
 * which a Server Component cannot. Narrowing the matcher would sign people out
 * at apparently random moments.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser, not getSession: the cookie on its own is client-supplied.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml)$).*)",
  ],
};
