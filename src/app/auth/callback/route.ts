import { NextResponse } from "next/server";

import { homeFor } from "@/lib/rbac";
import { getSessionUser } from "@/lib/rbac";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Where Supabase Auth's email links land.
 *
 * Confirmation, recovery and magic-link mails all carry a one-time `code` that
 * has to be exchanged for a session on the server, because the cookie must be
 * set on a real response. Without this route those links sign nobody in — they
 * just bounce to the site root looking like they worked.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  // Same-origin only — an open redirect here would be handed out by email.
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing-code", url.origin));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=expired-link", url.origin));
  }

  const user = await getSessionUser();
  return NextResponse.redirect(
    new URL(target ?? homeFor(user?.role ?? null), url.origin),
  );
}
