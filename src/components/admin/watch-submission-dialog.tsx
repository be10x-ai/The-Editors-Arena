"use client";

import { PlayCircle } from "lucide-react";
import * as React from "react";

import { SubmissionPlayer } from "@/components/shared/submission-player";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Lets an organiser watch an entry without entering the judging flow.
 *
 * The Watch button used to open `/judge/review/<id>` — the scoring form, with
 * an admin's name on it. Checking that a link plays, is the right person's edit
 * and is not a 360p upload is a different job from scoring one, and it should
 * not put an admin inside a judge's screen. The player opens over the table
 * instead, so the check costs no navigation at all.
 */
export function WatchSubmissionDialog({
  contestantId,
  contestantName,
  youtubeVideoId,
  youtubeUrl,
  previewUrl,
  viewUrl,
}: {
  contestantId: string;
  contestantName: string;
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  previewUrl?: string | null;
  viewUrl?: string | null;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <PlayCircle />
          Watch
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {contestantId} · {contestantName}
          </DialogTitle>
          <DialogDescription>
            A check, not a review — nothing here is recorded and no score is kept.
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so a table of entries is not a table of
            iframes all loading the YouTube player at once. */}
        {open ? (
          <SubmissionPlayer
            youtubeVideoId={youtubeVideoId}
            youtubeUrl={youtubeUrl}
            previewUrl={previewUrl}
            viewUrl={viewUrl}
            title={`${contestantId} submission`}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
