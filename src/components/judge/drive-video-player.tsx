import { ExternalLink, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Embedded Google Drive player.
 *
 * Drive's /preview endpoint streams inside an iframe, so judges watch without
 * downloading a multi-gigabyte file — and without us hosting video ourselves.
 */
export function DriveVideoPlayer({
  previewUrl,
  viewUrl,
  title,
}: {
  previewUrl: string | null;
  viewUrl?: string | null;
  title: string;
}) {
  if (!previewUrl) {
    return (
      <div className="border-white/12 flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-white/[0.02] text-center">
        <VideoOff className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">No video attached to this submission</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          The contestant may not have completed their upload. Flag it with the
          organisers rather than scoring an empty entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
        <iframe
          src={previewUrl}
          title={title}
          allow="autoplay; fullscreen"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 size-full"
        />
      </div>
      {viewUrl ? (
        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm">
            <a href={viewUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              Open in Drive
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
