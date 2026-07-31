import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoLockup } from "@/components/shared/logo";
import { LoginForm } from "@/components/forms/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Editor Arena dashboard.",
};

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: "Those credentials didn't match an account.",
  Configuration: "Sign-in is misconfigured on this deployment. Contact the organisers.",
  AccessDenied: "That account cannot sign in.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (session?.user) redirect(params.callbackUrl || homeFor(session.user.role));

  // Only allow same-origin callbacks — never bounce a session to another host.
  const callbackUrl =
    params.callbackUrl && params.callbackUrl.startsWith("/") ? params.callbackUrl : "";
  const error = params.error ? (AUTH_ERRORS[params.error] ?? "Sign-in failed.") : null;

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="aurora absolute inset-x-0 top-0 h-96" />
      <div aria-hidden className="grid-backdrop absolute inset-0 -z-10" />

      <header className="relative z-10">
        <div className="container flex h-16 items-center">
          <LogoLockup size={42} priority />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="heading-hero text-3xl">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your dashboard, judge portal, or admin console.
            </p>
          </div>

          {error ? (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Card className="mt-7">
            <CardContent className="p-6 sm:p-7">
              <LoginForm callbackUrl={callbackUrl} />
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Not registered yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-amber-300 underline-offset-4 hover:underline"
            >
              Enter the arena
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
