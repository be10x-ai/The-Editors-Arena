/** Shared shape for every `useActionState` server action in the app. */
export type ActionState<T = undefined> = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Zod flattened field errors, keyed by form field name. */
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

export const idleState: ActionState<never> = { status: "idle" };

export function errorState<T = undefined>(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionState<T> {
  return { status: "error", message, fieldErrors };
}

export function successState<T = undefined>(message: string, data?: T): ActionState<T> {
  return { status: "success", message, data };
}

/** Turns an unknown thrown value into a message safe to show a user. */
export function toMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error) {
    // Prisma and Google errors can be long and leak internals — keep it short.
    return error.message.length > 240 ? fallback : error.message;
  }
  return fallback;
}
