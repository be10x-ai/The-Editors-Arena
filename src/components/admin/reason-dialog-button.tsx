"use client";

import * as React from "react";

import { ActionForm, FieldError } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/server/actions/types";

/**
 * For actions that must be justified in writing (disqualification, rejection).
 * The reason is required server-side too — this is only the UI for it.
 */
export function ReasonDialogButton({
  action,
  fields,
  title,
  description,
  label,
  placeholder,
  confirmLabel = "Confirm",
  ...buttonProps
}: Omit<ButtonProps, "onClick" | "type"> & {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" {...buttonProps}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ActionForm
          action={action}
          className="space-y-4"
          resetOnSuccess
          onSuccess={() => setOpen(false)}
        >
          {Object.entries(fields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder={
                placeholder ?? "This is recorded and shown to the contestant."
              }
              required
              minLength={5}
            />
            <FieldError name="reason" />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton variant="destructive" pendingLabel="Saving…">
              {confirmLabel}
            </SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
