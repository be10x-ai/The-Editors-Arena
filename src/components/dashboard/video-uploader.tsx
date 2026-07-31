"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileVideo,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatBytes } from "@/lib/utils";

const ACCEPTED = ["video/mp4", "video/quicktime"];
const ACCEPTED_EXTENSIONS = [".mp4", ".mov"];

type Phase = "idle" | "preparing" | "uploading" | "finalising" | "done" | "error";

/**
 * Direct-to-Drive uploader.
 *
 * The file goes straight from the browser to a Google resumable-upload session
 * URI; our server only issues the session and records the resulting file id.
 * That keeps multi-gigabyte videos away from the serverless request body limit.
 */
export function VideoUploader({
  maxUploadMb,
  hasExistingSubmission,
}: {
  maxUploadMb: number;
  hasExistingSubmission: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const xhrRef = React.useRef<XMLHttpRequest | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const maxBytes = maxUploadMb * 1024 * 1024;
  const busy = phase === "preparing" || phase === "uploading" || phase === "finalising";

  function validate(candidate: File): string | null {
    const name = candidate.name.toLowerCase();
    const extensionOk = ACCEPTED_EXTENSIONS.some((extension) =>
      name.endsWith(extension),
    );
    // Some browsers report an empty or odd MIME type for .mov — trust the extension too.
    if (!ACCEPTED.includes(candidate.type) && !extensionOk) {
      return "Only MP4 and MOV files are accepted.";
    }
    if (candidate.size > maxBytes) {
      return `That file is ${formatBytes(candidate.size)} — the limit is ${maxUploadMb} MB.`;
    }
    if (candidate.size === 0) return "That file is empty.";
    return null;
  }

  function pick(candidate: File | null) {
    if (!candidate) return;
    const problem = validate(candidate);
    if (problem) {
      setError(problem);
      toast.error(problem);
      return;
    }
    setError(null);
    setPhase("idle");
    setProgress(0);
    setFile(candidate);
  }

  function mimeFor(candidate: File): "video/mp4" | "video/quicktime" {
    if (candidate.type === "video/quicktime") return "video/quicktime";
    if (candidate.type === "video/mp4") return "video/mp4";
    return candidate.name.toLowerCase().endsWith(".mov")
      ? "video/quicktime"
      : "video/mp4";
  }

  /** Single PUT of the whole file to the session URI, with progress events. */
  function putFile(uploadUrl: string, candidate: File, mimeType: string) {
    return new Promise<{ id: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", mimeType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText) as { id?: string };
            if (!parsed.id) throw new Error("no id");
            resolve({ id: parsed.id });
          } catch {
            reject(new Error("Drive accepted the file but returned no file id."));
          }
          return;
        }
        reject(
          new Error(
            `Upload failed (HTTP ${xhr.status}). Check your connection and try again.`,
          ),
        );
      };

      xhr.onerror = () =>
        reject(new Error("The connection dropped during upload. Please retry."));
      xhr.onabort = () => reject(new Error("Upload cancelled."));
      xhr.ontimeout = () => reject(new Error("Upload timed out. Please retry."));

      xhr.send(candidate);
    });
  }

  async function upload() {
    if (!file) return;

    setError(null);
    setPhase("preparing");
    setProgress(0);

    try {
      const mimeType = mimeFor(file);

      const sessionResponse = await fetch("/api/submissions/upload-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
        }),
      });

      const session = (await sessionResponse.json()) as {
        uploadUrl?: string;
        error?: string;
      };

      if (!sessionResponse.ok || !session.uploadUrl) {
        throw new Error(session.error ?? "Could not start the upload.");
      }

      setPhase("uploading");
      const uploaded = await putFile(session.uploadUrl, file, mimeType);

      setPhase("finalising");
      const completeResponse = await fetch("/api/submissions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveFileId: uploaded.id,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
        }),
      });

      const completed = (await completeResponse.json()) as {
        ok?: boolean;
        status?: string;
        error?: string;
      };

      if (!completeResponse.ok || !completed.ok) {
        throw new Error(
          completed.error ??
            "Your file reached Drive but we could not record it. Contact the organisers with your contestant ID.",
        );
      }

      setPhase("done");
      setProgress(100);
      toast.success(
        completed.status === "LATE"
          ? "Submission received — flagged as late."
          : "Submission received.",
      );
      router.refresh();
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Upload failed.";
      setPhase("error");
      setError(message);
      toast.error(message);
    } finally {
      xhrRef.current = null;
    }
  }

  function cancel() {
    xhrRef.current?.abort();
    setPhase("idle");
    setProgress(0);
  }

  if (phase === "done") {
    return (
      <Alert variant="success">
        <CheckCircle2 />
        <div>
          <AlertTitle>Upload complete</AlertTitle>
          <AlertDescription>
            Your video is safely in Drive and your submission is recorded. A
            confirmation email is on its way. You can replace it any time before the
            deadline.
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (busy) return;
          pick(event.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragging
            ? "border-amber-400/60 bg-amber-500/10"
            : "border-white/12 bg-white/[0.02]",
          busy && "opacity-70",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,video/mp4,video/quicktime"
          className="sr-only"
          onChange={(event) => pick(event.target.files?.[0] ?? null)}
          disabled={busy}
        />

        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-white/[0.06] text-amber-300">
          {file ? <FileVideo className="size-6" /> : <Upload className="size-6" />}
        </span>

        {file ? (
          <div className="mt-4">
            <p className="truncate font-medium">{file.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatBytes(file.size)} · {mimeFor(file) === "video/mp4" ? "MP4" : "MOV"}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="font-medium">Drop your final video here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              MP4 or MOV · up to {maxUploadMb} MB
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {file ? "Choose a different file" : "Choose file"}
          </Button>
          {file ? (
            <Button type="button" onClick={upload} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload />}
              {phase === "preparing"
                ? "Preparing…"
                : phase === "uploading"
                  ? `Uploading ${progress}%`
                  : phase === "finalising"
                    ? "Finalising…"
                    : hasExistingSubmission
                      ? "Replace my submission"
                      : "Upload final video"}
            </Button>
          ) : null}
          {phase === "uploading" ? (
            <Button type="button" variant="ghost" onClick={cancel}>
              <X />
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      {busy ? (
        <div className="space-y-2">
          <Progress
            value={phase === "uploading" ? progress : phase === "finalising" ? 100 : 5}
          />
          <p className="text-xs text-muted-foreground">
            {phase === "uploading"
              ? `${progress}% uploaded — keep this tab open until it finishes.`
              : phase === "finalising"
                ? "Recording your submission…"
                : "Asking Google Drive for an upload slot…"}
          </p>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <div>
            <AlertTitle>Upload problem</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      ) : null}
    </div>
  );
}
