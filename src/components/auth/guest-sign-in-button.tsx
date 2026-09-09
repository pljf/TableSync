"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { ButtonContent } from "@/components/ui/button-content";

type GuestSignInButtonProps = {
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function GuestSignInButton({
  label = "Continue as guest",
  className = "button full",
  disabled = false
}: GuestSignInButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const started = useRef(false);
  const feedbackId = useId();

  async function continueAsGuest() {
    if (disabled || started.current) return;
    started.current = true;
    setPending(true);
    setError(undefined);

    try {
      const { authClient } = await import("@/lib/auth-client");
      const current = await authClient.getSession({ query: { disableCookieCache: true } });
      if (current.error) throw new Error("Session could not be checked");
      if (!current.data?.user) {
        const result = await authClient.signIn.anonymous();
        if (result.error || !result.data?.user) {
          // Another open tab may have established this browser's session meanwhile.
          const resumed = await authClient.getSession({ query: { disableCookieCache: true } });
          if (resumed.error || !resumed.data?.user) throw new Error("Guest access could not start");
        }
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Guest access could not start. Please try again.");
      started.current = false;
      setPending(false);
    }
  }

  return (
    <div className="auth-action-stack">
      <button
        aria-busy={pending}
        aria-describedby={pending || error ? feedbackId : undefined}
        className={className}
        data-state={pending ? "pending" : error ? "error" : "idle"}
        disabled={disabled || pending}
        onClick={continueAsGuest}
        type="button"
      >
        <ButtonContent pending={pending} pendingLabel="Opening workspace…">
          <UserRound aria-hidden="true" size={16} />
          {label}
        </ButtonContent>
      </button>
      <ActionFeedback id={feedbackId} message={pending ? "Opening your workspace…" : error} state={pending ? "pending" : error ? "error" : "idle"} />
    </div>
  );
}
