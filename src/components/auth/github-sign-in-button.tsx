"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function GitHubSignInButton({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function signIn() {
    if (!enabled || pending) {
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
        errorCallbackURL: "/auth?error=provider"
      });
      if (result.error) {
        setError("GitHub sign-in could not start. Please try again.");
      }
    } catch {
      setError("GitHub sign-in could not start. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-action-stack">
      <button className="button full" disabled={!enabled || pending} onClick={signIn} type="button">
        <KeyRound size={16} />
        {pending ? "Opening GitHub..." : "Continue with GitHub"}
      </button>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </div>
  );
}
