"use client";

import { Pencil, X } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { updateOwnProfile } from "@/server/actions/profile";
import { idleState } from "@/server/actions/types";

const EXPERTISE_OPTIONS = [
  "Narrative editing",
  "Documentary",
  "Motion graphics",
  "Sound design",
  "Colour",
  "Short-form / Reels",
  "Advertising",
  "Music video",
  "Corporate",
  "VFX",
];

/**
 * Self-service profile editing for admins and judges.
 *
 * `showJudgeFields` renders the public-facing judge bio; those columns exist only
 * on the judge row, so the action ignores them for other roles.
 */
export function OwnProfileForm({
  defaultName,
  defaultTitle,
  defaultOrganization,
  defaultBio,
  defaultExpertise,
  showJudgeFields = false,
  description,
}: {
  defaultName: string;
  defaultTitle?: string | null;
  defaultOrganization?: string | null;
  defaultBio?: string | null;
  defaultExpertise?: string[];
  showJudgeFields?: boolean;
  description?: string;
}) {
  const [state, action] = useActionState(updateOwnProfile, idleState as never);
  const [expertise, setExpertise] = React.useState<string[]>(defaultExpertise ?? []);
  // Read-only until explicitly unlocked, so a stray keystroke on a page someone
  // opened to *look* at cannot change their own account.
  const [editing, setEditing] = React.useState(false);
  const errors = state.fieldErrors ?? {};

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
      setEditing(false);
    }
    if (state.status === "error") toast.error(state.message ?? "Could not save.");
  }, [state]);

  const cancel = () => {
    setExpertise(defaultExpertise ?? []);
    setEditing(false);
  };

  // `readOnly` rather than `disabled`: a disabled field submits nothing, and the
  // values still need to reach the action when the form is saved.
  const fieldTone = editing ? "" : "cursor-default border-white/[0.06] bg-white/[0.02]";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Details</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {!editing ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil />
              Edit
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={
                typeof state.values?.name === "string" && state.values.name
                  ? state.values.name
                  : defaultName
              }
              autoComplete="name"
              required
              readOnly={!editing}
              className={fieldTone}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? (
              <p className="text-xs font-medium text-rose-300">{errors.name[0]}</p>
            ) : null}
          </div>

          {showJudgeFields ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    readOnly={!editing}
                    className={fieldTone}
                    defaultValue={defaultTitle ?? ""}
                    placeholder="Senior Video Editor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organisation</Label>
                  <Input
                    id="organization"
                    name="organization"
                    readOnly={!editing}
                    className={fieldTone}
                    defaultValue={defaultOrganization ?? ""}
                    placeholder="House of EduTech"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Expertise</Label>
                {/* Hidden inputs from state, not checkboxes: React 19 resets the form
                after the action settles, which desyncs controlled checkboxes from
                the DOM and submits nothing. */}
                {expertise.map((item) => (
                  <input key={item} type="hidden" name="expertise" value={item} />
                ))}
                <div className="flex flex-wrap gap-2">
                  {EXPERTISE_OPTIONS.map((item) => {
                    const on = expertise.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={on}
                        disabled={!editing}
                        onClick={() =>
                          setExpertise((current) =>
                            current.includes(item)
                              ? current.filter((v) => v !== item)
                              : [...current, item],
                          )
                        }
                        className={cn(
                          "select-none rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          !editing && "cursor-default opacity-70",
                          on
                            ? "border-amber-400/50 bg-amber-500/20 text-foreground"
                            : "border-white/12 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-foreground",
                        )}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Short bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  readOnly={!editing}
                  className={fieldTone}
                  defaultValue={defaultBio ?? ""}
                  placeholder="Two or three sentences. Shown to contestants on the public jury list."
                />
                <p className="text-xs text-muted-foreground">
                  This is public — it appears on the landing page beside your name.
                </p>
              </div>
            </>
          ) : null}

          {editing ? (
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton variant="secondary" pendingLabel="Saving…">
                Save changes
              </SubmitButton>
              <Button type="button" variant="ghost" onClick={cancel}>
                <X />
                Cancel
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
