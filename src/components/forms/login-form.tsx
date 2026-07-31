"use client";

import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  requestLoginCode,
  signInWithOtp,
  signInWithPassword,
} from "@/server/actions/auth-actions";
import { idleState } from "@/server/actions/types";

/**
 * Two ways in: a one-time code (contestants) or a password (judges and admins).
 * The OTP tab is a two-step flow inside one component so the email persists.
 */
export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [codeSent, setCodeSent] = React.useState(false);
  const [email, setEmail] = React.useState("");

  const [requestState, requestAction] = useActionState(
    requestLoginCode,
    idleState as never,
  );
  const [otpState, otpAction] = useActionState(signInWithOtp, idleState as never);
  const [passwordState, passwordAction] = useActionState(
    signInWithPassword,
    idleState as never,
  );

  React.useEffect(() => {
    if (requestState.status === "success") {
      setCodeSent(true);
      if (requestState.data?.email) setEmail(requestState.data.email);
      toast.success(requestState.message ?? "Code sent.");
    }
    if (requestState.status === "error") toast.error(requestState.message ?? "Failed.");
  }, [requestState]);

  React.useEffect(() => {
    if (otpState.status === "error") toast.error(otpState.message ?? "Sign-in failed.");
  }, [otpState]);

  React.useEffect(() => {
    if (passwordState.status === "error") {
      toast.error(passwordState.message ?? "Sign-in failed.");
    }
  }, [passwordState]);

  return (
    <Tabs defaultValue="otp" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="otp">
          <Mail className="mr-2 size-4" />
          One-time code
        </TabsTrigger>
        <TabsTrigger value="password">
          <KeyRound className="mr-2 size-4" />
          Password
        </TabsTrigger>
      </TabsList>

      <TabsContent value="otp">
        {!codeSent ? (
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
                required
              />
              <p className="text-xs text-muted-foreground">
                Use the email you registered with. We&apos;ll send a 6-digit code.
              </p>
            </div>
            <SubmitButton className="w-full" pendingLabel="Sending code…">
              Send me a code
              <ArrowRight />
            </SubmitButton>
          </form>
        ) : (
          <form action={otpAction} className="space-y-5">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="callbackUrl" value={callbackUrl} />

            <div className="space-y-2">
              <Label htmlFor="otp">6-digit code</Label>
              <Input
                id="otp"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                className="text-center font-mono text-xl tracking-[0.4em]"
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                Sent to {email}. It expires in 10 minutes and works once.
              </p>
            </div>

            <SubmitButton className="w-full" pendingLabel="Verifying…">
              Sign in
              <ArrowRight />
            </SubmitButton>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setCodeSent(false)}
            >
              <ArrowLeft />
              Use a different email
            </Button>
          </form>
        )}
      </TabsContent>

      <TabsContent value="password">
        <form action={passwordAction} className="space-y-5">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          <div className="space-y-2">
            <Label htmlFor="password-email">Email</Label>
            <Input
              id="password-email"
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

          <p className="text-xs leading-relaxed text-muted-foreground">
            Judges and admins sign in here. Contestants don&apos;t need a password — use
            a one-time code instead.
          </p>
        </form>
      </TabsContent>
    </Tabs>
  );
}
