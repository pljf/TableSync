"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Ban, CircleMinus, Heart } from "lucide-react";
import { castVoteAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialMutationState } from "@/lib/mutation-state";

export function VoteForm({ planId }: { planId: string }) {
  const [mutationState, formAction] = useActionState(castVoteAction, initialMutationState);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const reasonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mutationState.status === "success" && mutationState.mutationId) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("updated", mutationState.mutationId);
      window.location.replace(nextUrl.toString());
    }
  }, [mutationState.mutationId, mutationState.status]);

  function validateVote(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === "VETO" && reason.trim() === "") {
      event.preventDefault();
      setError("Explain the Veto so the host and other guests can respond.");
      reasonRef.current?.focus();
      return;
    }
    setError(undefined);
  }

  return (
    <form action={formAction} className="vote-form" onSubmit={validateVote}>
      <input name="planId" type="hidden" value={planId} />
      <label>
        Veto reason
        <input
          aria-describedby={error || mutationState.status === "error" ? `vote-error-${planId}` : undefined}
          aria-invalid={Boolean(error) || mutationState.status === "error"}
          name="reason"
          onChange={(event) => {
            setReason(event.target.value);
            if (error) {
              setError(undefined);
            }
          }}
          placeholder="Required only for Veto"
          ref={reasonRef}
          value={reason}
        />
      </label>
      {error ? (
        <p className="field-error" id={`vote-error-${planId}`} role="alert">
          {error}
        </p>
      ) : null}
      {!error && mutationState.status !== "idle" ? (
        <p
          className={mutationState.status === "error" ? "field-error" : "success-text"}
          id={`vote-error-${planId}`}
          role="status"
        >
          {mutationState.message}
        </p>
      ) : null}
      <div className="button-row">
        <SubmitButton className="button secondary" name="value" pendingLabel="Saving vote..." value="LIKE">
          <Heart size={16} />
          Like
        </SubmitButton>
        <SubmitButton className="button secondary" name="value" pendingLabel="Saving vote..." value="NEUTRAL">
          <CircleMinus size={16} />
          Neutral
        </SubmitButton>
        <SubmitButton className="button danger" name="value" pendingLabel="Saving Veto..." value="VETO">
          <Ban size={16} />
          Veto
        </SubmitButton>
      </div>
    </form>
  );
}
