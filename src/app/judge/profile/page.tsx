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

export default async function JudgeProfilePage() {
  const session = await requireRole("JUDGE");

  const [user, judge] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true, email: true, lastLoginAt: true },
    }),
    prisma.judge.findFirst({
      where: { userId: session.id },
      select: {
        name: true,
        title: true,
        organization: true,
        bio: true,
        expertise: true,
        isActive: true,
      },
    }),
  ]);

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Account</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">My profile</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Your name, title and bio appear on the public jury list. Email is the login
          identifier and cannot be changed here.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Shown to contestants on the landing page.</CardDescription>
          </CardHeader>
          <CardContent>
            <OwnProfileForm
              showJudgeFields
              defaultName={judge?.name ?? user?.name ?? ""}
              defaultTitle={judge?.title}
              defaultOrganization={judge?.organization}
              defaultBio={judge?.bio}
              defaultExpertise={judge?.expertise ?? []}
            />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {[
                  ["Email", user?.email ?? "—"],
                  ["Role", "Judge"],
                  ["Status", judge?.isActive ? "Active" : "Inactive"],
                  [
                    "Last sign-in",
                    user?.lastLoginAt ? formatIST(user.lastLoginAt) : "—",
                  ],
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
                Replace the password the organisers issued you.
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
