"use client";

import { ArrowRight, Mail } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestLoginCode,
  signInWithCode,
  signInWithPassword,
} from "@/server/actions/auth-actions";
import { idleState, type ActionState } from "@/server/actions/types";

/**
 * Password first, for contestants, judges and admins alike — contestants choose
 * one while registering, and it works even when no mail relay is configured.
 *
 * The emailed code is a deliberate second choice, shown only when someone says
 * they have forgotten their password. Keeping it off the default path is what
 * stops a broken relay from locking the whole event out, which is why an
 * earlier code-only sign-in was removed.
 */
type Mode = "password" | "request" | "verify";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [mode, setMode] = React.useState<Mode>("password");
  const [email, setEmail] = React.useState("");

  const [passwordState, passwordAction] = useActionState(
    signInWithPassword,
    idleState as never,
  );
  const [requestState, requestAction] = useActionState(
    requestLoginCode,
    idleState as ActionState<{ email: string }>,
  );
  const [codeState, codeAction] = useActionState(signInWithCode, idleState as never);

  React.useEffect(() => {
    if (passwordState.status === "error") {
      toast.error(passwordState.message ?? "Sign-in failed.");
    }
  }, [passwordState]);

  React.useEffect(() => {
    if (codeState.status === "error") {
      toast.error(codeState.message ?? "Sign-in failed.");
    }
  }, [codeState]);

  // A sent code moves the form on to the code entry step. The action reports
  // success even for unknown addresses, so this reveals nothing either way.
  React.useEffect(() => {
    if (requestState.status === "success" && requestState.data?.email) {
      setEmail(requestState.data.email);
      setMode("verify");
      toast.success(requestState.message ?? "Code sent.");
    } else if (requestState.status === "error") {
      toast.error(requestState.message ?? "Could not send a code.");
    }
  }, [requestState]);

  if (mode === "request") {
    return (
      <form action={requestAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="otp-email">Email</Label>
          <Input
            id="otp-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={email}
            autoFocus
            required
          />
          <p className="text-xs text-muted-foreground">
            We&apos;ll email you a 6-digit code that signs you in once. It expires in
            10 minutes.
          </p>
        </div>

        <SubmitButton className="w-full" pendingLabel="Sending…">
          <Mail />
          Email me a code
        </SubmitButton>

        <ModeLink onClick={() => setMode("password")}>
          Back to password sign-in
        </ModeLink>
      </form>
    );
  }

  if (mode === "verify") {
    return (
      <form action={codeAction} className="space-y-5">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <input type="hidden" name="email" value={email} />

        <div className="space-y-2">
          <Label htmlFor="otp">6-digit code</Label>
          <Input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            className="text-center text-lg tracking-[0.4em]"
            autoFocus
            required
          />
          <p className="text-xs text-muted-foreground">
            Sent to {email}. Check spam if it hasn&apos;t arrived.
          </p>
        </div>

        <SubmitButton className="w-full" pendingLabel="Signing in…">
          Sign in
          <ArrowRight />
        </SubmitButton>

        <ModeLink onClick={() => setMode("request")}>
          Use a different email, or send a new code
        </ModeLink>
      </form>
    );
  }

  return (
    <form action={passwordAction} className="space-y-5">
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

      <ModeLink onClick={() => setMode("request")}>
        Forgot your password? Email me a code instead
      </ModeLink>
    </form>
  );
}

function ModeLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-sky-300 hover:underline"
    >
      {children}
    </button>
  );
}
