import { Download, FileArchive, KeyRound, Lock } from "lucide-react";

import { CopyField } from "@/components/shared/copy-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Gates } from "@/lib/hackathon";
import { formatIST } from "@/lib/utils";

/**
 * Task asset distribution. Two independent locks: the download appears when the
 * admin releases assets, the password only when they announce it.
 */
export function AssetCard({
  gates,
  zipName,
  driveUrl,
  password,
  startsAt,
}: {
  gates: Gates;
  zipName: string;
  driveUrl: string | null;
  password: string | null;
  startsAt: Date;
}) {
  if (!gates.assetsVisible) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-muted-foreground">
              <Lock className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold">
                Task files are locked
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                The download button and the ZIP password both appear on this page the
                moment the hackathon goes live
                {gates.status === "NOT_STARTED"
                  ? ` — scheduled for ${formatIST(startsAt)} IST.`
                  : "."}{" "}
                Nothing is sent by email or DM.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/25 bg-amber-500/[0.06]">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-200">
              <FileArchive className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold">
                Task files are live
              </h3>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                {zipName}
              </p>
            </div>
          </div>

          {driveUrl ? (
            <Button asChild>
              <a href={driveUrl} target="_blank" rel="noopener noreferrer">
                <Download />
                Download Task Files
              </a>
            </Button>
          ) : null}
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-amber-300" />
            <p className="label-eyebrow">Task ZIP password</p>
          </div>

          {gates.passwordVisible && password ? (
            <>
              <CopyField value={password} label="ZIP password" className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                Keep this to yourself. Sharing it is grounds for disqualification.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              The password is announced here by the organisers at the start of the
              event. Download the ZIP now so you&apos;re ready to extract the moment it
              appears.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
