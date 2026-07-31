"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionState } from "@/server/actions/types";
import { idleState } from "@/server/actions/types";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Action state is published through context rather than a render prop.
 *
 * Server components render most of these forms, and a function child cannot
 * cross the server→client boundary — so fields read errors with <FieldError />
 * instead of receiving them as arguments.
 */
const ActionFormContext = React.createContext<ActionState>({ status: "idle" });

export function useActionFormState(): ActionState {
  return React.useContext(ActionFormContext);
}

/** Inline validation message for one field. Renders nothing when valid. */
export function FieldError({ name }: { name: string }) {
  const state = useActionFormState();
  const message = state.fieldErrors?.[name]?.[0];
  if (!message) return null;
  return <p className="text-xs font-medium text-rose-300">{message}</p>;
}

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  showErrorBanner = true,
  onSuccess,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  showErrorBanner?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(action, idleState as never);

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.();
      router.refresh();
    }
    if (state.status === "error" && state.message) toast.error(state.message);
    // `onSuccess` is intentionally excluded — callers pass inline closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, resetOnSuccess, router]);

  return (
    <ActionFormContext.Provider value={state}>
      <form ref={formRef} action={formAction} className={className}>
        {showErrorBanner && state.status === "error" && state.message ? (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        {children}
      </form>
    </ActionFormContext.Provider>
  );
}
