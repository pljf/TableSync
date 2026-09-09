"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import Link from "next/link";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { ButtonContent } from "@/components/ui/button-content";

const subscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export function InviteLink({ path }: { path: string }) {
  const origin = useSyncExternalStore(subscribe, getOrigin, getServerOrigin);
  const inviteUrl = `${origin}${path}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string>();
  const [copyState, setCopyState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const copying = useRef(false);
  const feedbackId = useId();

  async function copyInvite() {
    if (!origin || copying.current) return;
    copying.current = true;
    setCopyState("pending");
    setFeedback("Copying your invite link…");
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("success");
      setFeedback("Invite link copied. Share it with your guests.");
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      setCopyState("error");
      setFeedback("Select and copy the invite link above to share it with your guests.");
    } finally {
      copying.current = false;
    }
  }

  return (
    <article className="card invite-card">
      <div className="section-title">
        <ClipboardCopy aria-hidden="true" size={18} />
        <h2>Invite link</h2>
      </div>
      <p className="muted">A place for everyone. Send your link and let guests share what they love to eat.</p>
      <label>
        Guest invite link
        <input readOnly ref={inputRef} value={inviteUrl} />
      </label>
      <div className="button-row form-actions">
        <button aria-busy={copyState === "pending"} aria-describedby={feedback ? feedbackId : undefined} className="button" data-state={copyState} disabled={!origin || copyState === "pending"} onClick={copyInvite} type="button">
          <ButtonContent pending={copyState === "pending"} pendingLabel="Copying link…">
            {copyState === "success" ? <Check aria-hidden="true" size={16} /> : <ClipboardCopy aria-hidden="true" size={16} />}
            Copy invite link
          </ButtonContent>
        </button>
        <Link className="button secondary" href={path} prefetch={false}>
          Open guest form
        </Link>
      </div>
      <ActionFeedback id={feedbackId} message={feedback} state={copyState} />
    </article>
  );
}
