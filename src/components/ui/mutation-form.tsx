"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { initialMutationState, type MutationState } from "@/lib/mutation-state";

type MutationAction = (state: MutationState, formData: FormData) => Promise<MutationState>;

export function MutationForm({
  action,
  children,
  className
}: {
  action: MutationAction;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, initialMutationState);

  useEffect(() => {
    if (state.status === "success" && state.mutationId) {
      const nextUrl = new URL(state.redirectTo ?? window.location.href, window.location.origin);
      if (!state.redirectTo) {
        nextUrl.searchParams.set("updated", state.mutationId);
      }
      window.location.replace(nextUrl.toString());
    }
  }, [state.mutationId, state.redirectTo, state.status]);

  return (
    <form action={formAction} className={className}>
      {children}
      {state.status !== "idle" ? (
        <p className={`form-feedback ${state.status === "error" ? "field-error" : "success-text"}`} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
