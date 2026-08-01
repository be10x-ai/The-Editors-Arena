import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Supabase client bound to the request's cookies.
 *
 * Auth state lives in cookies rather than a JWT we mint ourselves, so the
 * session survives a page render, a server action and the middleware alike.
 * `setAll` is wrapped because Next forbids writing cookies while rendering a
 * Server Component — the middleware refreshes the session on every request, so
 * a token rotation that lands mid-render is safely dropped here and reapplied
 * on the next hop.
 */
export async function supabaseServer() {
  const store = await cookies();

  return createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, options);
          }
        } catch {
          // Read-only cookie store: a Server Component render. Ignored by design.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses row-level security, so it is server-only and
 * must never be handed a request's cookies — it is not acting as the visitor.
 */
export function supabaseAdmin() {
  return createServerClient(env.supabase.url, env.supabase.serviceRoleKey, {
    cookies: { getAll: () => [], setAll: () => undefined },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
