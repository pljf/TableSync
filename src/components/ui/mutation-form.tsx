"use client";

import { useActionState, useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { initialMutationState, type MutationState } from "@/lib/mutation-state";

type MutationAction = (state: MutationState, formData: FormData) => Promise<MutationState>;

const subscribeToHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverHydratedSnapshot = () => false;

type ControlSnapshot =
  | { checked: boolean; index: number; kind: "checked"; name: string }
  | { index: number; kind: "selected"; name: string; values: string[] }
  | { index: number; kind: "value"; name: string; value: string };

function snapshotControls(form: HTMLFormElement): ControlSnapshot[] {
  return Array.from(form.elements).flatMap((control, index): ControlSnapshot[] => {
    if (control instanceof HTMLInputElement) {
      if (!control.name || control.type === "file" || control.type === "submit") return [];
      if (control.type === "checkbox" || control.type === "radio") {
        return [{ checked: control.checked, index, kind: "checked", name: control.name }];
      }
      return [{ index, kind: "value", name: control.name, value: control.value }];
    }
    if (control instanceof HTMLTextAreaElement) {
      return control.name ? [{ index, kind: "value", name: control.name, value: control.value }] : [];
    }
    if (control instanceof HTMLSelectElement) {
      return control.name
        ? [{
            index,
            kind: "selected",
            name: control.name,
            values: Array.from(control.selectedOptions).map((option) => option.value)
          }]
        : [];
    }
    return [];
  });
}

function restoreControls(form: HTMLFormElement, snapshots: ControlSnapshot[]): void {
  const controls = Array.from(form.elements);
  for (const snapshot of snapshots) {
    const control = controls[snapshot.index];
    if (!control || !("name" in control) || control.name !== snapshot.name) continue;
    if (snapshot.kind === "checked" && control instanceof HTMLInputElement) {
      control.checked = snapshot.checked;
    } else if (snapshot.kind === "selected" && control instanceof HTMLSelectElement) {
      for (const option of control.options) option.selected = snapshot.values.includes(option.value);
    } else if (
      snapshot.kind === "value" &&
      (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)
    ) {
      control.value = snapshot.value;
    }
  }
}

export function MutationForm({
  action,
  children,
  className,
  waitForHydration = false
}: {
  action: MutationAction;
  children: ReactNode;
  className?: string;
  waitForHydration?: boolean;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToHydration, hydratedSnapshot, serverHydratedSnapshot);
  const ready = !waitForHydration || hydrated;
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedControls = useRef<ControlSnapshot[]>([]);
  const [pendingMessage, setPendingMessage] = useState("Saving changes…");
  const [edited, setEdited] = useState(false);
  const [state, formAction, pending] = useActionState(async (previousState: MutationState, data: FormData) => {
    try {
      const result = await action(previousState, data);
      if (result.status === "error" && formRef.current) {
        submittedControls.current = snapshotControls(formRef.current);
      }
      return result;
    } catch (error) {
      unstable_rethrow(error);
      if (formRef.current) submittedControls.current = snapshotControls(formRef.current);
      return {
        status: "error" as const,
        message: "We could not confirm that change. Check your connection and try again.",
        mutationId: crypto.randomUUID()
      };
    } finally {
      submitting.current = false;
    }
  }, initialMutationState);
  const feedbackId = useId();

  useEffect(() => {
    if (state.status === "success" && state.mutationId) {
      const nextUrl = new URL(state.redirectTo ?? window.location.href, window.location.origin);
      if (!state.redirectTo) {
        nextUrl.searchParams.set("updated", state.mutationId);
      }
      router.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, { scroll: false });
      router.refresh();
    }
  }, [router, state.mutationId, state.redirectTo, state.status]);

  useEffect(() => {
    if (state.status === "error" && formRef.current) {
      restoreControls(formRef.current, submittedControls.current);
      const active = document.activeElement;
      if (
        !active || active === document.body ||
        (formRef.current.contains(active) && !active.matches("input, textarea, select"))
      ) {
        formRef.current.querySelector<HTMLElement>('[role="alert"]')?.focus();
      }
    }
  }, [state.mutationId, state.status]);

  function preserveSubmittedControls(event: FormEvent<HTMLFormElement>) {
    if (!ready || pending || submitting.current) {
      event.preventDefault();
      return;
    }
    submitting.current = true;
    setEdited(false);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    setPendingMessage(submitter?.getAttribute("data-pending-label") ?? "Saving changes…");
    submittedControls.current = snapshotControls(event.currentTarget);
  }

  const feedbackState = pending ? "pending" : edited && state.status === "success" ? "idle" : state.status;

  return (
    <form
      action={formAction}
      aria-busy={waitForHydration ? !ready || pending : undefined}
      aria-describedby={feedbackState !== "idle" ? feedbackId : undefined}
      className={className}
      data-state={feedbackState}
      onChange={() => setEdited(true)}
      onSubmit={preserveSubmittedControls}
      ref={formRef}
    >
      {waitForHydration ? (
        <fieldset aria-label="Meal preferences" disabled={!ready} style={{ display: "contents" }}>
          {children}
        </fieldset>
      ) : children}
      <ActionFeedback id={feedbackId} message={pending ? pendingMessage : state.message} state={feedbackState} />
    </form>
  );
}
