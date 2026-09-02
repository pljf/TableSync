"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function signOut() {
    if (pending) {
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/");
            router.refresh();
          }
        }
      });
      if (result.error) {
        setError("Sign-out could not be completed. Please try again.");
      }
    } catch {
      setError("Sign-out could not be completed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-action-stack compact-auth-action">
      <button className="icon-text-button" disabled={pending} onClick={signOut} type="button">
        <LogOut size={16} />
        {pending ? "Signing out..." : "Sign out"}
      </button>
      {error ? <p className="field-error compact-auth-error" role="alert">{error}</p> : null}
    </div>
  );
}
