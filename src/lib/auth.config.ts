import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the auth setup.
 *
 * `middleware.ts` imports only this file, so it must never pull in Prisma,
 * bcrypt or the Node runtime. Providers live in `src/lib/auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.contestantRowId = user.contestantRowId ?? null;
        token.contestantId = user.contestantId ?? null;
        token.judgeId = user.judgeId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.contestantRowId = token.contestantRowId ?? null;
        session.user.contestantId = token.contestantId ?? null;
        session.user.judgeId = token.judgeId ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
