"use client";

import { ArrowRight } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPassword } from "@/server/actions/auth-actions";
import { idleState } from "@/server/actions/types";

/**
 * One way in: email and password, for contestants, judges and admins alike.
 * Contestants choose their password while registering.
 *
 * The one-time-code path was removed — it made sign-in depend on outbound email,
 * so with no mail relay configured nobody could get in at all.
 */
export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(signInWithPassword, idleState as never);

  React.useEffect(() => {
    if (state.status === "error") toast.error(state.message ?? "Sign-in failed.");
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
        <ArrowRight />
      </SubmitButton>
    </form>
  );
}
