"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setOwnPassword } from "@/server/actions/auth-actions";
import { idleState } from "@/server/actions/types";

/** Optional password for people who'd rather not use email codes each time. */
export function SetPasswordForm() {
  const [state, formAction] = useActionState(setOwnPassword, idleState as never);
  const errors = state.fieldErrors ?? {};

  React.useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Password updated.");
    if (state.status === "error") toast.error(state.message ?? "Could not update.");
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters, with a number"
          required
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password ? (
          <p className="text-xs font-medium text-rose-300">{errors.password[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.confirmPassword)}
        />
        {errors.confirmPassword ? (
          <p className="text-xs font-medium text-rose-300">
            {errors.confirmPassword[0]}
          </p>
        ) : null}
      </div>

      <SubmitButton variant="secondary" pendingLabel="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}
