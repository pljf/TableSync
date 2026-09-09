"use client";

import { useId, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { ButtonContent } from "@/components/ui/button-content";

export function GitHubSignInButton({ enabled, upgrade = false }: { enabled: boolean; upgrade?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const started = useRef(false);
  const feedbackId = useId();

  async function signIn() {
    if (!enabled || started.current) {
      return;
    }
    started.current = true;
    setPending(true);
    setError(undefined);
    try {
      const { authClient } = await import("@/lib/auth-client");
      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: upgrade ? "/dashboard?saved=1" : "/dashboard",
        errorCallbackURL: upgrade ? "/auth?upgrade=1&error=provider" : "/auth?error=provider"
      });
      if (result.error || !result.data?.url) throw new Error("The provider did not return a sign-in destination.");
    } catch {
      setError("GitHub sign-in could not start. Please try again.");
      started.current = false;
      setPending(false);
    }
  }

  return (
    <div className="auth-action-stack">
      <button aria-busy={pending} aria-describedby={pending || error ? feedbackId : undefined} className="button full" data-state={pending ? "pending" : error ? "error" : "idle"} disabled={!enabled || pending} onClick={signIn} type="button">
        <ButtonContent pending={pending} pendingLabel="Opening GitHub…">
          <KeyRound aria-hidden="true" size={16} />
          {upgrade ? "Save my rooms with GitHub" : "Continue with GitHub"}
        </ButtonContent>
      </button>
      <ActionFeedback id={feedbackId} message={pending ? "Opening GitHub to continue sign-in…" : error} state={pending ? "pending" : error ? "error" : "idle"} />
    </div>
  );
}
