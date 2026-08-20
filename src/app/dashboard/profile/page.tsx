import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ContestantDetailsForm } from "@/components/forms/contestant-details-form";
import { PhotoUploadForm } from "@/components/forms/photo-upload-form";
import { SetPasswordForm } from "@/components/forms/set-password-form";
import { CopyField } from "@/components/shared/copy-field";
import { ContestantStatusBadge } from "@/components/shared/status-badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { avatarPublicUrl } from "@/lib/storage";
import { requireRole } from "@/lib/rbac";
import { formatIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireRole("CONTESTANT");

  const contestant = await prisma.contestant.findUnique({
    where: { id: user.contestantRowId ?? "" },
  });
  if (!contestant) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <p className="label-eyebrow">Profile</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Your details</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Keep these current — the organisers use them to reach you about the task, the
          result and anything you win. Your email and contestant ID are fixed; email the
          organisers if either is wrong.
        </p>
      </div>

      {/* The identity strip. Photo, ID and status are the three things looked up
          rather than read, so they sit across the top instead of competing with
          the form for the same column. */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <PhotoUploadForm currentUrl={avatarPublicUrl(contestant.photoPath)} />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold">
                {contestant.fullName}
              </h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {contestant.email}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <ContestantStatusBadge status={contestant.status} />
                <span className="text-xs text-muted-foreground">
                  Registered {formatIST(contestant.registeredAt)} IST
                </span>
              </div>
            </div>
          </div>

          <div className="lg:w-72 lg:shrink-0">
            <p className="label-eyebrow mb-2">Contestant ID</p>
            <CopyField value={contestant.contestantId} label="Contestant ID" />
            <p className="mt-2 text-xs text-muted-foreground">
              Your video title must start with this.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
            <CardDescription>
              Everything you entered when you signed up. Edit any of it yourself.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContestantDetailsForm
              details={{
                fullName: contestant.fullName,
                email: contestant.email,
                phone: contestant.phone,
                city: contestant.city,
                address: contestant.address,
                experienceYears: contestant.experienceYears,
                softwareSkills: contestant.softwareSkills,
                portfolioUrl: contestant.portfolioUrl,
                heardFrom: contestant.heardFrom,
              }}
            />
          </CardContent>
        </Card>

        {/* The right column is password-only on purpose: the portfolio link and
            the software chips live in the form beside it, and a read-only copy
            of two fields the entrant is already looking at is just the same
            page twice. */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                You sign in with {contestant.email} and this password.
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
