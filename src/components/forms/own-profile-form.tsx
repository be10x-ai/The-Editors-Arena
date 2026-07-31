"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
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
}: {
  defaultName: string;
  defaultTitle?: string | null;
  defaultOrganization?: string | null;
  defaultBio?: string | null;
  defaultExpertise?: string[];
  showJudgeFields?: boolean;
}) {
  const [state, action] = useActionState(updateOwnProfile, idleState as never);
  const [expertise, setExpertise] = React.useState<string[]>(defaultExpertise ?? []);
  const errors = state.fieldErrors ?? {};

  React.useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Saved.");
    if (state.status === "error") toast.error(state.message ?? "Could not save.");
  }, [state]);

  return (
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
                defaultValue={defaultTitle ?? ""}
                placeholder="Senior Video Editor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">Organisation</Label>
              <Input
                id="organization"
                name="organization"
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
                    onClick={() =>
                      setExpertise((current) =>
                        current.includes(item)
                          ? current.filter((v) => v !== item)
                          : [...current, item],
                      )
                    }
                    className={cn(
                      "select-none rounded-full border px-3 py-1.5 text-xs font-medium transition",
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
              defaultValue={defaultBio ?? ""}
              placeholder="Two or three sentences. Shown to contestants on the public jury list."
            />
            <p className="text-xs text-muted-foreground">
              This is public — it appears on the landing page beside your name.
            </p>
          </div>
        </>
      ) : null}

      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
