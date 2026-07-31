"use client";

import { UserRound } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContestantPhoto } from "@/server/actions/profile";
import { idleState } from "@/server/actions/types";

/**
 * Profile photo upload with a local preview.
 *
 * The preview is a browser object URL so the entrant sees the crop before
 * spending an upload; the server re-checks type and size regardless, since a
 * client-side `accept` attribute is a hint, not a constraint.
 */
export function PhotoUploadForm({ currentUrl }: { currentUrl: string | null }) {
  const [state, action] = useActionState(updateContestantPhoto, idleState as never);
  const [preview, setPreview] = React.useState<string | null>(null);
  const errors = state.fieldErrors ?? {};

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Photo updated.");
      setPreview(null);
    }
    if (state.status === "error") toast.error(state.message ?? "Upload failed.");
  }, [state]);

  // Object URLs leak until revoked, and this component can re-render on every
  // file pick.
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shown = preview ?? currentUrl;

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {shown ? (
            <Image
              src={shown}
              alt="Your profile photo"
              width={160}
              height={160}
              unoptimized={Boolean(preview)}
              className="size-full object-cover"
            />
          ) : (
            <UserRound className="size-7 text-muted-foreground" />
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="photo">Profile photo</Label>
          <Input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WebP. Up to 2 MB. A square image crops best.
          </p>
          {errors.photo ? (
            <p className="text-xs font-medium text-rose-300">{errors.photo[0]}</p>
          ) : null}
        </div>
      </div>

      <SubmitButton pendingLabel="Uploading…">
        {currentUrl ? "Replace photo" : "Upload photo"}
      </SubmitButton>
    </form>
  );
}
