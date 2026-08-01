"use client";

import { Camera, UserRound, ZoomIn } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { updateContestantPhoto } from "@/server/actions/profile";
import { idleState } from "@/server/actions/types";

/** Side of the square we upload. Bigger than any place it is displayed. */
const OUTPUT_PX = 512;
/** Side of the on-screen crop window, in CSS pixels. */
const FRAME_PX = 264;
const MAX_ZOOM = 3;

type Loaded = { element: HTMLImageElement; url: string };

/**
 * Profile photo in one button.
 *
 * Picking a file opens an adjust step rather than uploading immediately: the
 * entrant drags to reposition and zooms, and what is inside the frame is
 * exactly what is saved. The crop is rendered to a canvas and uploaded as a
 * square JPEG, so the server never receives the original — which also means a
 * 12 MP phone photo arrives well under the size limit instead of being
 * rejected after the wait.
 */
export function PhotoUploadForm({ currentUrl }: { currentUrl: string | null }) {
  const [state, dispatch, pending] = useActionState(
    updateContestantPhoto,
    idleState as never,
  );

  const inputRef = React.useRef<HTMLInputElement>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const drag = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Photo updated.");
      closeEditor();
    }
    if (state.status === "error") toast.error(state.message ?? "Upload failed.");
    // closeEditor is stable for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Revoke on unmount as well as on close — a page navigation mid-edit would
  // otherwise leak the decoded image.
  React.useEffect(() => {
    return () => {
      if (loaded) URL.revokeObjectURL(loaded.url);
    };
  }, [loaded]);

  /** Cover scale: the smallest zoom that still fills the frame in both axes. */
  function baseScale(image: HTMLImageElement): number {
    return Math.max(FRAME_PX / image.naturalWidth, FRAME_PX / image.naturalHeight);
  }

  function clamp(next: { x: number; y: number }, image: HTMLImageElement, z: number) {
    const scale = baseScale(image) * z;
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    // Top-left may never move inside the frame, or a gap opens at the edge.
    return {
      x: Math.min(0, Math.max(FRAME_PX - w, next.x)),
      y: Math.min(0, Math.max(FRAME_PX - h, next.y)),
    };
  }

  function closeEditor() {
    setLoaded((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }

    const url = URL.createObjectURL(file);
    const element = new window.Image();
    element.onload = () => {
      const scale = baseScale(element);
      // Start centred, which is what someone expects from a portrait.
      setOffset({
        x: (FRAME_PX - element.naturalWidth * scale) / 2,
        y: (FRAME_PX - element.naturalHeight * scale) / 2,
      });
      setZoom(1);
      setLoaded({ element, url });
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("That image could not be read. Try a JPG or PNG.");
    };
    element.src = url;
  }

  function onZoom(next: number) {
    if (!loaded) return;
    // Keep the frame's centre fixed while zooming, otherwise the picture appears
    // to run away from the handle.
    const from = baseScale(loaded.element) * zoom;
    const to = baseScale(loaded.element) * next;
    const ratio = to / from;
    const centred = {
      x: FRAME_PX / 2 - (FRAME_PX / 2 - offset.x) * ratio,
      y: FRAME_PX / 2 - (FRAME_PX / 2 - offset.y) * ratio,
    };
    setZoom(next);
    setOffset(clamp(centred, loaded.element, next));
  }

  function onPointerDown(event: React.PointerEvent) {
    if (!loaded) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag.current || !loaded) return;
    const next = {
      x: drag.current.ox + (event.clientX - drag.current.x),
      y: drag.current.oy + (event.clientY - drag.current.y),
    };
    setOffset(clamp(next, loaded.element, zoom));
  }

  function onPointerUp(event: React.PointerEvent) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
  }

  async function save() {
    if (!loaded) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_PX;
    canvas.height = OUTPUT_PX;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Your browser could not process the image.");
      return;
    }

    // The frame is FRAME_PX on screen and OUTPUT_PX in the file, so every
    // measurement scales by the same factor and the result matches the preview.
    const k = OUTPUT_PX / FRAME_PX;
    const scale = baseScale(loaded.element) * zoom;
    context.drawImage(
      loaded.element,
      offset.x * k,
      offset.y * k,
      loaded.element.naturalWidth * scale * k,
      loaded.element.naturalHeight * scale * k,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) {
      toast.error("Could not prepare the image. Try a different one.");
      return;
    }

    const data = new FormData();
    data.append("photo", blob, "profile.jpg");
    React.startTransition(() => dispatch(data));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {currentUrl ? (
            <Image
              src={currentUrl}
              alt="Your profile photo"
              width={160}
              height={160}
              className="size-full object-cover"
            />
          ) : (
            <UserRound className="size-7 text-muted-foreground" />
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            <Camera />
            {currentUrl ? "Change photo" : "Add photo"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WebP. You can reposition and zoom before saving.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={onPick}
        />
      </div>

      <Dialog
        open={Boolean(loaded)}
        onOpenChange={(open) => {
          if (!open && !pending) closeEditor();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust your photo</DialogTitle>
            <DialogDescription>
              Drag to reposition, and zoom to fill the frame. What you see here is
              what gets saved.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-5">
            <div
              ref={frameRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{ width: FRAME_PX, height: FRAME_PX }}
              className="relative max-w-full cursor-grab touch-none overflow-hidden rounded-2xl border border-white/15 bg-black/40 active:cursor-grabbing"
            >
              {loaded ? (
                // A blob URL with hand-computed geometry — next/image would
                // fight the positioning and cannot optimise it anyway.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={loaded.url}
                  alt=""
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: offset.x,
                    top: offset.y,
                    width: loaded.element.naturalWidth * baseScale(loaded.element) * zoom,
                    height:
                      loaded.element.naturalHeight * baseScale(loaded.element) * zoom,
                    maxWidth: "none",
                  }}
                />
              ) : null}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20"
              />
            </div>

            <div className="flex w-full items-center gap-3">
              <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                onValueChange={([next]) => onZoom(next)}
                aria-label="Zoom"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeEditor}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
