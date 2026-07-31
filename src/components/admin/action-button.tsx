"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionState } from "@/server/actions/types";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type SimpleAction = () => Promise<ActionState>;

/**
 * One-click server action with optional confirmation, toast feedback and a
 * pending state. Used across the admin console so every destructive control
 * behaves identically.
 */
export function ActionButton({
  action,
  fields,
  confirm,
  children,
  pendingLabel,
  onDone,
  ...buttonProps
}: Omit<ButtonProps, "onClick" | "type"> & {
  action: FormAction | SimpleAction;
  /** Hidden values passed to the action as FormData. */
  fields?: Record<string, string | number | boolean | undefined>;
  confirm?: { title: string; description: string; confirmLabel?: string };
  pendingLabel?: string;
  onDone?: (state: ActionState) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  async function run() {
    setPending(true);
    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) {
        if (value !== undefined) formData.set(key, String(value));
      }

      // A no-arg action ignores the extra arguments; a form action needs them.
      const state = await (action as FormAction)({ status: "idle" }, formData);

      if (state.status === "error") toast.error(state.message ?? "That didn't work.");
      else toast.success(state.message ?? "Done.");

      onDone?.(state);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong. Try again.",
      );
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        disabled={pending || buttonProps.disabled}
        onClick={() => (confirm ? setOpen(true) : run())}
        {...buttonProps}
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            {pendingLabel ?? "Working…"}
          </>
        ) : (
          children
        )}
      </Button>

      {confirm ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirm.title}</DialogTitle>
              <DialogDescription>{confirm.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={run} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {confirm.confirmLabel ?? "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
