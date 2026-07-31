import type { Metadata } from "next";

import { OwnProfileForm } from "@/components/forms/own-profile-form";
import { SetPasswordForm } from "@/components/forms/set-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My profile" };

export default async function AdminProfilePage() {
  const session = await requireRole("ADMIN");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true, email: true, lastLoginAt: true, createdAt: true },
  });

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Account</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">My profile</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Your own name and password. Email is the login identifier and cannot be
          changed here.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <OwnProfileForm defaultName={user?.name ?? ""} />

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {[
                  ["Email", user?.email ?? "—"],
                  ["Role", "Admin"],
                  [
                    "Last sign-in",
                    user?.lastLoginAt ? formatIST(user.lastLoginAt) : "—",
                  ],
                  ["Created", user?.createdAt ? formatIST(user.createdAt) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="break-all text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                Replace the seeded password before the event.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SetPasswordForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
