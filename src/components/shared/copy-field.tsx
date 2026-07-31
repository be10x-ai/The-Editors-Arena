"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Monospaced value with a copy affordance — used for IDs and the ZIP password. */
export function CopyField({
  value,
  label,
  className,
  mask = false,
}: {
  value: string;
  label?: string;
  className?: string;
  mask?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const [revealed, setRevealed] = React.useState(!mask);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label ?? "Value"} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the text and copy manually.");
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2",
        className,
      )}
    >
      <code className="min-w-0 flex-1 truncate font-mono text-sm tracking-wider text-foreground">
        {revealed ? value : "•".repeat(Math.min(value.length, 16))}
      </code>
      {mask ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setRevealed((v) => !v)}
        >
          {revealed ? "Hide" : "Show"}
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={copy}
        aria-label={`Copy ${label ?? "value"}`}
      >
        {copied ? <Check className="text-emerald-400" /> : <Copy />}
      </Button>
    </div>
  );
}
