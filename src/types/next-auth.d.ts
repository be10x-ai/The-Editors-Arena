import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      /** Present for contestants: the internal Contestant row id. */
      contestantRowId?: string | null;
      /** Present for contestants: the public competition ID, e.g. EA20260001. */
      contestantId?: string | null;
      /** Present for judges: the Judge row id. */
      judgeId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role: Role;
    contestantRowId?: string | null;
    contestantId?: string | null;
    judgeId?: string | null;
  }
}

// `next-auth/jwt` only re-exports from @auth/core/jwt, so the augmentation has
// to target the source module for the JWT callback to be typed.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    contestantRowId?: string | null;
    contestantId?: string | null;
    judgeId?: string | null;
  }
}
