import { ExternalLink, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { youtubeEmbedUrl } from "@/lib/youtube";

/**
 * Plays a submission. Shared by the judge review page and the admin console —
 * same player, different reason for watching.
 *
 * Prefers the YouTube embed. Falls back to the Drive preview iframe so entries
 * submitted before the switch to links are still watchable — those rows keep
 * their `previewUrl` and have no video id.
 */
export function SubmissionPlayer({
  youtubeVideoId,
  youtubeUrl,
  previewUrl,
  viewUrl,
  title,
}: {
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  previewUrl?: string | null;
  viewUrl?: string | null;
  title: string;
}) {
  const embedSrc = youtubeVideoId ? youtubeEmbedUrl(youtubeVideoId) : previewUrl;
  const openHref = youtubeUrl ?? viewUrl ?? null;

  if (!embedSrc) {
    return (
      <div className="border-white/12 flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-white/[0.02] text-center">
        <VideoOff className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">No video attached to this submission</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          The contestant may not have submitted a link. Flag it with the organisers
          rather than scoring an empty entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
        <iframe
          src={embedSrc}
          title={title}
          allow="accelerometer; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 size-full"
        />
      </div>
      {openHref ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {youtubeVideoId
              ? "If the player shows an error, the entrant may have set the video to Private — flag it, do not score it zero silently."
              : "Legacy Drive upload."}
          </p>
          <Button asChild variant="ghost" size="sm">
            <a href={openHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              {youtubeVideoId ? "Open on YouTube" : "Open in Drive"}
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
