import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PhotoUploadForm } from "@/components/forms/photo-upload-form";
import { SetPasswordForm } from "@/components/forms/set-password-form";
import { CopyField } from "@/components/shared/copy-field";
import { ContestantStatusBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
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

  const links = [{ label: "Portfolio", href: contestant.portfolioUrl }].filter(
    (link): link is { label: string; href: string } => Boolean(link.href),
  );

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Profile</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Your details</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Need something changed? Email the organisers — registration details are locked
          after entry so the judging record stays clean.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
            <CardDescription>
              Registered {formatIST(contestant.registeredAt)} IST
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="label-eyebrow mb-2">Contestant ID</p>
              <CopyField value={contestant.contestantId} label="Contestant ID" />
            </div>

            <dl className="space-y-3 text-sm">
              {[
                ["Full name", contestant.fullName],
                ["Email", contestant.email],
                ["Phone", contestant.phone],
                ["City", contestant.city],
                [
                  "Experience",
                  `${contestant.experienceYears} year${contestant.experienceYears === 1 ? "" : "s"}`,
                ],
                ["Current role", contestant.jobRole],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <ContestantStatusBadge status={contestant.status} />
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Software &amp; links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="label-eyebrow mb-2">Software skills</p>
                <div className="flex flex-wrap gap-2">
                  {contestant.softwareSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="label-eyebrow mb-2">Links</p>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-300 underline-offset-4 hover:underline"
                      >
                        {link.label}
                        <ExternalLink className="size-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile photo</CardTitle>
              <CardDescription>
                Optional. Shown to the organisers alongside your entry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhotoUploadForm currentUrl={avatarPublicUrl(contestant.photoPath)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                You sign in with this email and password.
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
