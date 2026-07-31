import { Save } from "lucide-react";
import type { Metadata } from "next";

import { ActionForm, FieldError } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getActiveHackathon } from "@/lib/hackathon";
import { requireRole } from "@/lib/rbac";
import { toISTInputValue } from "@/lib/utils";
import { saveHackathonSettings } from "@/server/actions/admin/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings" };

const DATE_FIELDS = [
  { name: "registrationOpensAt", label: "Registration opens" },
  { name: "registrationClosesAt", label: "Registration closes" },
  { name: "startsAt", label: "Hackathon starts" },
  { name: "taskReleaseAt", label: "Task release" },
  { name: "submissionDeadline", label: "Submission deadline" },
  { name: "judgingEndsAt", label: "Judging ends" },
  { name: "resultsAt", label: "Results announced" },
] as const;

export default async function AdminSettingsPage() {
  await requireRole("ADMIN");
  const hackathon = await getActiveHackathon();
  if (!hackathon) return null;

  return (
    <div className="space-y-7">
      <div>
        <p className="label-eyebrow">Configuration</p>
        <h1 className="heading-hero mt-2 text-2xl sm:text-3xl">Settings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Event dates drive the public countdown, the reminder schedule and every access
          gate. Changing the start time re-queues all pending reminders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event configuration</CardTitle>
          <CardDescription>All dates are in IST (Asia/Kolkata).</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={saveHackathonSettings} className="space-y-6">
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Hackathon name</Label>
                  <Input id="name" name="name" defaultValue={hackathon.name} required />
                  <FieldError name="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    name="tagline"
                    defaultValue={hackathon.tagline}
                    required
                  />
                </div>
              </div>

              <div>
                <p className="label-eyebrow mb-3">Schedule</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {DATE_FIELDS.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name}>{field.label}</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="datetime-local"
                        defaultValue={toISTInputValue(
                          hackathon[field.name] as unknown as Date,
                        )}
                        required
                      />
                      <FieldError name={field.name} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="label-eyebrow mb-3">Submissions &amp; judging</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxUploadMb">Maximum upload size (MB)</Label>
                    <Input
                      id="maxUploadMb"
                      name="maxUploadMb"
                      type="number"
                      min={50}
                      max={20480}
                      defaultValue={hackathon.maxUploadMb}
                      required
                    />
                    <FieldError name="maxUploadMb" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="judgesPerSubmission">Judges per submission</Label>
                    <Input
                      id="judgesPerSubmission"
                      name="judgesPerSubmission"
                      type="number"
                      min={1}
                      max={15}
                      defaultValue={hackathon.judgesPerSubmission}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <Checkbox
                      id="allowLateSubmission"
                      name="allowLateSubmission"
                      defaultChecked={hackathon.allowLateSubmission}
                    />
                    <Label
                      htmlFor="allowLateSubmission"
                      className="text-sm font-normal"
                    >
                      Accept uploads after the deadline (flagged as late)
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <p className="label-eyebrow mb-3">Google Sheet</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sheetId">Spreadsheet ID</Label>
                    <Input
                      id="sheetId"
                      name="sheetId"
                      defaultValue={hackathon.sheetId ?? ""}
                      placeholder="Falls back to GOOGLE_SHEET_ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sheetTabName">Tab name</Label>
                    <Input
                      id="sheetTabName"
                      name="sheetTabName"
                      defaultValue={hackathon.sheetTabName}
                      required
                    />
                  </div>
                </div>
              </div>

              <SubmitButton pendingLabel="Saving…">
                <Save />
                Save settings
              </SubmitButton>
            </>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
