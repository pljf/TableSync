"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { ButtonContent } from "@/components/ui/button-content";

export function SignOutButton({ isGuest = false }: { isGuest?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const started = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const confirmationId = useId();
  const feedbackId = useId();

  useEffect(() => {
    if (confirmEnd) keepRef.current?.focus();
  }, [confirmEnd]);

  function closeConfirmation() {
    setConfirmEnd(false);
    triggerRef.current?.focus();
  }

  async function signOut() {
    if (started.current) {
      return;
    }
    started.current = true;
    setPending(true);
    setError(undefined);
    try {
      const { authClient } = await import("@/lib/auth-client");
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign-out was not completed.");
      router.push("/");
      router.refresh();
    } catch {
      setError("Sign-out could not be completed. Please try again.");
      started.current = false;
      setPending(false);
    }
  }

  return (
    <div className="auth-action-stack compact-auth-action" onKeyDown={(event) => {
      if (event.key === "Escape" && confirmEnd && !pending) {
        event.preventDefault();
        event.stopPropagation();
        closeConfirmation();
      }
    }}>
      <button
        aria-busy={pending}
        aria-controls={isGuest && confirmEnd ? confirmationId : undefined}
        aria-describedby={pending || error ? feedbackId : undefined}
        aria-expanded={isGuest ? confirmEnd : undefined}
        className="icon-text-button"
        data-state={pending ? "pending" : error ? "error" : "idle"}
        disabled={pending}
        onClick={isGuest ? () => confirmEnd ? closeConfirmation() : setConfirmEnd(true) : signOut}
        ref={triggerRef}
        type="button"
      >
        <ButtonContent pending={pending} pendingLabel={isGuest ? "Ending session…" : "Signing out…"}>
          <LogOut aria-hidden="true" size={16} />
          {isGuest ? "End guest session" : "Sign out"}
        </ButtonContent>
      </button>
      {isGuest && confirmEnd ? (
        <div className="guest-end-confirmation" id={confirmationId} role="group" aria-label="End guest session confirmation">
          <strong>End your guest session?</strong>
          <p>You won’t be able to reopen this guest account’s rooms. Ending the session also removes all meal responses saved in this browser. Keep this session, or save your hosted rooms to an account first.</p>
          <div className="button-row">
            <Link className="button secondary" href="/auth?upgrade=1" prefetch={false}>Save my rooms</Link>
            <button className="button secondary" disabled={pending} onClick={closeConfirmation} ref={keepRef} type="button">Keep guest session</button>
            <button aria-busy={pending} aria-describedby={pending || error ? feedbackId : undefined} className="button danger" data-state={pending ? "pending" : error ? "error" : "idle"} disabled={pending} onClick={signOut} type="button">
              <ButtonContent pending={pending} pendingLabel="Ending…">End session</ButtonContent>
            </button>
          </div>
          <ActionFeedback id={feedbackId} message={pending ? "Ending your guest session…" : error} state={pending ? "pending" : error ? "error" : "idle"} />
        </div>
      ) : null}
      {!isGuest || !confirmEnd ? <ActionFeedback className="compact-auth-error" id={feedbackId} message={pending ? (isGuest ? "Ending your guest session…" : "Signing out…") : error} state={pending ? "pending" : error ? "error" : "idle"} /> : null}
    </div>
  );
}
