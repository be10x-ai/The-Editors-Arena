"use client";

import { AlertTriangle, ArrowRight, Youtube } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseYoutubeId } from "@/lib/youtube";
import { submitYoutubeLink } from "@/server/actions/submission";
import { idleState } from "@/server/actions/types";

/**
 * Submits the entrant's YouTube link, and replaces it on every later submit.
 *
 * `replacing` only changes the wording: the same action backs both, and the
 * window — not the first submit — is what closes the form. The link is echoed
 * back into the field so a one-character fix is a one-character edit rather
 * than a re-paste.
 */
export function YoutubeSubmitForm({
  currentUrl,
  replacing = false,
}: {
  currentUrl?: string | null;
  replacing?: boolean;
} = {}) {
  const [state, action] = useActionState(submitYoutubeLink, idleState as never);
  const [url, setUrl] = React.useState(currentUrl ?? "");

  const fieldErrors = state.fieldErrors ?? {};
  const echoed =
    typeof state.values?.youtubeUrl === "string" && state.values.youtubeUrl
      ? state.values.youtubeUrl
      : (currentUrl ?? "");

  // Live feedback, so a bad paste is caught before it is sent at all.
  const videoId = parseYoutubeId(url || echoed);
  const looksValid = Boolean(videoId);

  React.useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <div>
            <AlertTitle>{replacing ? "Not updated" : "Not submitted"}</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="youtubeUrl">
          {replacing ? "New YouTube link *" : "YouTube link *"}
        </Label>
        <Input
          id="youtubeUrl"
          name="youtubeUrl"
          type="url"
          inputMode="url"
          defaultValue={echoed}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          required
          aria-invalid={Boolean(fieldErrors.youtubeUrl)}
        />
        {fieldErrors.youtubeUrl?.length ? (
          <p className="text-xs font-medium text-rose-300">
            {fieldErrors.youtubeUrl[0]}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Watch, share or Shorts links all work. Set the video to{" "}
            <strong className="text-foreground">Public or Unlisted</strong> — a Private
            video cannot be watched by the jury and scores zero.
          </p>
        )}
        {url && !looksValid ? (
          <p className="text-xs font-medium text-orange-300">
            That does not look like a YouTube video link yet.
          </p>
        ) : null}
        {looksValid ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <Youtube className="size-3.5" />
            Link recognised — video ID {videoId}
          </p>
        ) : null}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/[0.07] p-4">
        <Checkbox id="confirmFinal" name="confirmFinal" required className="mt-0.5" />
        <Label htmlFor="confirmFinal" className="text-sm font-normal leading-relaxed">
          This is the edit I want judged. I can change this link until the submission
          deadline — after that, whatever is here is what the jury watches.
        </Label>
      </div>
      {fieldErrors.confirmFinal?.length ? (
        <p className="text-xs font-medium text-rose-300">
          {fieldErrors.confirmFinal[0]}
        </p>
      ) : null}

      <SubmitButton
        size="lg"
        className="w-full sm:w-auto"
        pendingLabel={replacing ? "Updating…" : "Submitting…"}
      >
        {replacing ? "Update my link" : "Submit my link"}
        <ArrowRight />
      </SubmitButton>
    </form>
  );
}
