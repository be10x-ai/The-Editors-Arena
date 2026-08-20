"use client";

import { Pencil, X } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EXPERIENCE_OPTIONS, SOFTWARE_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { updateContestantDetails } from "@/server/actions/profile";
import { idleState } from "@/server/actions/types";

export type ContestantDetails = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  address: string | null;
  experienceYears: number;
  softwareSkills: string[];
  portfolioUrl: string;
  heardFrom: string | null;
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs font-medium text-rose-300">{errors[0]}</p>;
}

/**
 * The entrant's own registration, read-only until they ask to edit it.
 *
 * One component for both states rather than a display card plus a separate
 * form: the details are read far more often than they are changed, and two
 * renderings of the same nine fields is where a field ends up missing from one
 * of them. `readOnly` rather than `disabled`, because a disabled input submits
 * nothing and the values still have to reach the action.
 */
export function ContestantDetailsForm({ details }: { details: ContestantDetails }) {
  const [state, action] = useActionState(updateContestantDetails, idleState as never);
  const [editing, setEditing] = React.useState(false);
  const [skills, setSkills] = React.useState<string[]>(details.softwareSkills);

  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  /** Server echo after a rejected save, falling back to what is stored. */
  const prev = (name: keyof ContestantDetails, fallback: string) => {
    const value = values[name];
    return typeof value === "string" && value ? value : fallback;
  };

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
      setEditing(false);
    }
    if (state.status === "error") {
      toast.error(state.message ?? "Could not save.");
      // A rejected save keeps the form open — closing it would discard the
      // corrections the entrant is being asked to make.
      setEditing(true);
    }
  }, [state]);

  const cancel = () => {
    setSkills(details.softwareSkills);
    setEditing(false);
  };

  const tone = editing ? "" : "cursor-default border-white/[0.06] bg-white/[0.02]";

  return (
    <form action={action} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label-eyebrow">Registration details</p>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name *</Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={prev("fullName", details.fullName)}
            autoComplete="name"
            required
            readOnly={!editing}
            className={tone}
            aria-invalid={Boolean(errors.fullName)}
          />
          <FieldError errors={errors.fullName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={details.email}
            readOnly
            disabled
            className="cursor-default border-white/[0.06] bg-white/[0.02]"
          />
          <p className="text-xs text-muted-foreground">
            This is your login. Email the organisers to change it.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={prev("phone", details.phone)}
            autoComplete="tel"
            required
            readOnly={!editing}
            className={tone}
            aria-invalid={Boolean(errors.phone)}
          />
          <FieldError errors={errors.phone} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            name="city"
            defaultValue={prev("city", details.city)}
            autoComplete="address-level2"
            required
            readOnly={!editing}
            className={tone}
            aria-invalid={Boolean(errors.city)}
          />
          <FieldError errors={errors.city} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address *</Label>
          <Textarea
            id="address"
            name="address"
            rows={2}
            defaultValue={prev("address", details.address ?? "")}
            autoComplete="street-address"
            placeholder="Flat / house, street, area, state, PIN code"
            required
            readOnly={!editing}
            className={tone}
            aria-invalid={Boolean(errors.address)}
          />
          <FieldError errors={errors.address} />
          {!details.address && !editing ? (
            <p className="text-xs text-orange-300">
              Not on file — add it so the organisers can courier anything you win.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="experienceYears">Experience *</Label>
          {/* Native select while read-only would still open on click; the
              trigger is disabled instead and the value ships in a hidden input
              so a save that never touched this field keeps it. */}
          {editing ? (
            <Select
              name="experienceYears"
              required
              defaultValue={prev("experienceYears", String(details.experienceYears))}
            >
              <SelectTrigger id="experienceYears">
                <SelectValue placeholder="Select experience" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <input
                type="hidden"
                name="experienceYears"
                value={details.experienceYears}
              />
              <Input
                readOnly
                className={tone}
                value={
                  EXPERIENCE_OPTIONS.find(
                    (option) => option.value === String(details.experienceYears),
                  )?.label ??
                  `${details.experienceYears} year${details.experienceYears === 1 ? "" : "s"}`
                }
              />
            </>
          )}
          <FieldError errors={errors.experienceYears} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="heardFrom">Heard about us via</Label>
          <Input
            id="heardFrom"
            value={details.heardFrom ?? "—"}
            readOnly
            disabled
            className="cursor-default border-white/[0.06] bg-white/[0.02]"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="portfolioUrl">Portfolio or showreel *</Label>
          <Input
            id="portfolioUrl"
            name="portfolioUrl"
            type="url"
            inputMode="url"
            defaultValue={prev("portfolioUrl", details.portfolioUrl)}
            required
            readOnly={!editing}
            className={tone}
            aria-invalid={Boolean(errors.portfolioUrl)}
          />
          <FieldError errors={errors.portfolioUrl} />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Editing software *</Label>
        {/* Hidden inputs rendered from state rather than checkboxes: React 19
            resets the form once the action settles, which leaves controlled
            checkboxes looking picked while submitting nothing. */}
        {skills.map((skill) => (
          <input key={skill} type="hidden" name="softwareSkills" value={skill} />
        ))}
        <div className="flex flex-wrap gap-2">
          {SOFTWARE_OPTIONS.map((software) => {
            const on = skills.includes(software);
            return (
              <button
                key={software}
                type="button"
                aria-pressed={on}
                disabled={!editing}
                onClick={() =>
                  setSkills((current) =>
                    current.includes(software)
                      ? current.filter((value) => value !== software)
                      : [...current, software],
                  )
                }
                className={cn(
                  "select-none rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  !editing && "cursor-default",
                  on
                    ? "border-sky-400/50 bg-sky-500/20 text-foreground"
                    : cn(
                        "border-white/12 bg-white/[0.03] text-muted-foreground",
                        editing
                          ? "hover:border-white/25 hover:text-foreground"
                          : "opacity-45",
                      ),
                )}
              >
                {software}
              </button>
            );
          })}
        </div>
        <FieldError errors={errors.softwareSkills} />
      </div>

      {editing ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-5">
          <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          <Button type="button" variant="ghost" onClick={cancel}>
            <X />
            Cancel
          </Button>
        </div>
      ) : null}
    </form>
  );
}
