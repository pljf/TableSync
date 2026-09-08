"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { Ban, CircleMinus, Heart } from "lucide-react";
import { castVoteAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { initialMutationState, type MutationState } from "@/lib/mutation-state";
import type { Vote } from "@/lib/domain";

const voteLabels: Record<Vote["value"], string> = {
  LIKE: "Like",
  NEUTRAL: "Neutral",
  VETO: "Veto"
};

const subscribeToHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverHydratedSnapshot = () => false;

export function VoteForm({ currentVote, planId }: { currentVote?: Vote; planId: string }) {
  const router = useRouter();
  // A streamed form can be visible before its controlled input handler exists.
  // Keep it unavailable until hydration can retain every typed draft.
  const hydrated = useSyncExternalStore(subscribeToHydration, hydratedSnapshot, serverHydratedSnapshot);
  const [reason, setReason] = useState(currentVote?.reason ?? "");
  const submitting = useRef(false);
  const [confirmedVote, setConfirmedVote] = useState<{ baseline?: Vote; value: Vote["value"] }>();
  const [edited, setEdited] = useState(false);
  const [mutationState, formAction, pending] = useActionState(async (previousState: MutationState, formData: FormData) => {
    try {
      const result = await castVoteAction(previousState, formData);
      if (result.status === "success") {
        const submittedReason = String(formData.get("reason") ?? "");
        const savedValue = formData.get("value") as Vote["value"];
        const savedReason = savedValue === "VETO" ? submittedReason.trim() : "";
        setReason((current) => current === submittedReason ? savedReason : current);
        setConfirmedVote({ baseline: currentVote, value: savedValue });
      }
      return result;
    } catch (error) {
      unstable_rethrow(error);
      return { status: "error" as const, message: "We could not confirm your vote. Check your connection and try again.", mutationId: crypto.randomUUID() };
    } finally {
      submitting.current = false;
    }
  }, initialMutationState);
  const [error, setError] = useState<string>();
  const reasonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mutationState.status === "success" && mutationState.mutationId) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("updated", mutationState.mutationId);
      router.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, { scroll: false });
      router.refresh();
    }
  }, [router, mutationState.mutationId, mutationState.status]);

  function validateVote(event: FormEvent<HTMLFormElement>) {
    if (!hydrated || pending || submitting.current) {
      event.preventDefault();
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === "VETO" && reason.trim() === "") {
      event.preventDefault();
      setError("Explain the Veto so the host and other guests can respond.");
      reasonRef.current?.focus();
      return;
    }
    submitting.current = true;
    setEdited(false);
    setError(undefined);
  }

  const displayedVote = confirmedVote && confirmedVote.baseline === currentVote ? confirmedVote.value : currentVote?.value;
  const feedbackState = error ? "error" : pending ? "pending" : edited && mutationState.status === "success" ? "idle" : mutationState.status;

  return (
    <form action={formAction} aria-busy={!hydrated || pending} className="vote-form" data-state={feedbackState} onSubmit={validateVote}>
      <input name="planId" type="hidden" value={planId} />
      {displayedVote ? (
        <p className="current-vote" role="status">
          Your current vote: <strong>{voteLabels[displayedVote]}</strong>
        </p>
      ) : null}
      <label>
        Veto reason
        <input
          aria-describedby={error || mutationState.status === "error" ? `vote-error-${planId}` : undefined}
          aria-invalid={Boolean(error)}
          data-dirty={reason !== (currentVote?.reason ?? "")}
          disabled={!hydrated}
          name="reason"
          maxLength={1000}
          onChange={(event) => {
            setReason(event.target.value);
            setEdited(true);
            if (error) {
              setError(undefined);
            }
          }}
          placeholder="Required only for Veto"
          ref={reasonRef}
          value={reason}
        />
      </label>
      <ActionFeedback id={`vote-error-${planId}`} message={error ?? (pending ? "Saving your vote…" : mutationState.message)} state={feedbackState} />
      <div className="button-row">
        <SubmitButton aria-pressed={displayedVote === "LIKE"} className="button secondary" disabled={!hydrated} name="value" pendingLabel="Saving…" value="LIKE">
          <Heart aria-hidden="true" size={16} />
          Like
        </SubmitButton>
        <SubmitButton aria-pressed={displayedVote === "NEUTRAL"} className="button secondary" disabled={!hydrated} name="value" pendingLabel="Saving…" value="NEUTRAL">
          <CircleMinus aria-hidden="true" size={16} />
          Neutral
        </SubmitButton>
        <SubmitButton aria-pressed={displayedVote === "VETO"} className="button danger" disabled={!hydrated} name="value" pendingLabel="Saving…" value="VETO">
          <Ban aria-hidden="true" size={16} />
          Veto
        </SubmitButton>
      </div>
    </form>
  );
}
