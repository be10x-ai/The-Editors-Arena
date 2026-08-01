import { UserCheck, UserPlus } from "lucide-react";
import type { Metadata } from "next";

import { ActionForm, FieldError } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatIST } from "@/lib/utils";
import { upsertJudge } from "@/server/actions/admin/judges";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Judges" };

export default async function AdminJudgesPage() {
  await requireRole("ADMIN");

  const judges = await prisma.judge.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { lastLoginAt: true, isActive: true } },
      // Drafts are not reviews. Counting every Rating row credited a judge for
      // work they had started and not finished, and kept crediting them after
      // an admin unlocked a scorecard — which is precisely when an organiser
      // looks at this number to see who still owes a review.
      _count: {
        select: {
          assignments: true,
          ratings: { where: { isSubmitted: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Jury</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Judges</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Each judge gets their own login and only sees the submissions assigned to
          them. Scores are attributed by name in the hiring report and anonymised in
          participant scorecards.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add a judge</CardTitle>
            <CardDescription>
              Leave the password blank and we generate one, then email it if you tick
              &ldquo;send invite&rdquo;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={upsertJudge} className="space-y-4" resetOnSuccess>
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" required placeholder="Rhea Kapoor" />
                  <FieldError name="name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="judge@example.com"
                  />
                  <FieldError name="email" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" placeholder="Creative Director" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organisation</Label>
                    <Input
                      id="organization"
                      name="organization"
                      placeholder="House of EduTech"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expertise">Expertise</Label>
                  <Input
                    id="expertise"
                    name="expertise"
                    placeholder="Narrative, Sound design, Colour"
                  />
                  <p className="text-xs text-muted-foreground">Comma separated.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    placeholder="Optional, shown internally."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="text"
                    autoComplete="off"
                    placeholder="Leave blank to auto-generate"
                  />
                  <FieldError name="password" />
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                  <Checkbox id="sendInvite" name="sendInvite" defaultChecked />
                  <Label htmlFor="sendInvite" className="text-sm font-normal">
                    Email the invite with portal link and password
                  </Label>
                </div>

                <SubmitButton pendingLabel="Adding…">
                  <UserPlus />
                  Add judge
                </SubmitButton>
              </>
            </ActionForm>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {judges.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No judges yet"
              description="Add your jury before the submission deadline so you can assign submissions the moment uploads close."
            />
          ) : (
            judges.map((judge) => (
              <Card key={judge.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-base font-semibold">
                          {judge.name}
                        </p>
                        <Badge variant={judge.isActive ? "success" : "outline"}>
                          {judge.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {[judge.title, judge.organization]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {judge.email}
                      </p>
                    </div>

                    <div className="text-right text-xs text-muted-foreground">
                      <p className="tabular-nums">
                        <span className="font-semibold text-foreground">
                          {judge._count.ratings}
                        </span>{" "}
                        / {judge._count.assignments} reviewed
                      </p>
                      <p className="mt-0.5">
                        Last login{" "}
                        {judge.user.lastLoginAt
                          ? formatIST(judge.user.lastLoginAt)
                          : "never"}
                      </p>
                    </div>
                  </div>

                  {judge.expertise.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {judge.expertise.map((item) => (
                        <Badge key={item} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-amber-300">
                      Edit
                    </summary>
                    <ActionForm action={upsertJudge} className="mt-4 space-y-4">
                      <>
                        <input type="hidden" name="id" value={judge.id} />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`name-${judge.id}`}>Name</Label>
                            <Input
                              id={`name-${judge.id}`}
                              name="name"
                              defaultValue={judge.name}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`email-${judge.id}`}>Email</Label>
                            <Input
                              id={`email-${judge.id}`}
                              name="email"
                              type="email"
                              defaultValue={judge.email}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`title-${judge.id}`}>Title</Label>
                            <Input
                              id={`title-${judge.id}`}
                              name="title"
                              defaultValue={judge.title ?? ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`org-${judge.id}`}>Organisation</Label>
                            <Input
                              id={`org-${judge.id}`}
                              name="organization"
                              defaultValue={judge.organization ?? ""}
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor={`expertise-${judge.id}`}>Expertise</Label>
                            <Input
                              id={`expertise-${judge.id}`}
                              name="expertise"
                              defaultValue={judge.expertise.join(", ")}
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor={`password-${judge.id}`}>
                              Reset password
                            </Label>
                            <Input
                              id={`password-${judge.id}`}
                              name="password"
                              type="text"
                              autoComplete="off"
                              placeholder="Leave blank to keep current password"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Paired with the checkbox so "unchecked" is explicit. */}
                          <input type="hidden" name="isActive" value="false" />
                          <Checkbox
                            id={`active-${judge.id}`}
                            name="isActive"
                            value="true"
                            defaultChecked={judge.isActive}
                          />
                          <Label
                            htmlFor={`active-${judge.id}`}
                            className="text-sm font-normal"
                          >
                            Active (can sign in and score)
                          </Label>
                        </div>

                        <SubmitButton
                          variant="secondary"
                          size="sm"
                          pendingLabel="Saving…"
                        >
                          Save changes
                        </SubmitButton>
                      </>
                    </ActionForm>
                  </details>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
