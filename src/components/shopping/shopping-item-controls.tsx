"use client";

import { useState } from "react";
import { PackageCheck, UserPlus } from "lucide-react";
import { claimShoppingAction, toggleShoppingAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";
import type { Guest } from "@/lib/domain";

function useSavedDraft<T extends string | boolean>(saved: T) {
  const [draft, setDraft] = useState({ saved, value: saved });
  let current = draft;
  if (draft.saved !== saved) {
    current = { saved, value: draft.value === draft.saved ? saved : draft.value };
    setDraft(current);
  }
  return [current.value, (value: T) => setDraft({ saved, value })] as const;
}

export function ShoppingItemControls({
  assignedToGuestId,
  checked,
  guests,
  guestId,
  hostCanManage,
  itemId,
  itemName
}: {
  assignedToGuestId?: string;
  checked: boolean;
  guests: Pick<Guest, "id" | "name">[];
  guestId?: string;
  hostCanManage: boolean;
  itemId: string;
  itemName: string;
}) {
  const initialAssignment = assignedToGuestId ?? "";
  const [assignment, setAssignment] = useSavedDraft(initialAssignment);
  const [purchased, setPurchased] = useSavedDraft(checked);
  const guestCanClaim = Boolean(guestId && !assignedToGuestId);
  const guestCanManage = Boolean(guestId && assignedToGuestId === guestId);

  return (
    <>
      {hostCanManage ? <MutationForm action={claimShoppingAction} className="inline-form">
        <input name="itemId" type="hidden" value={itemId} />
        <UserPlus aria-hidden="true" size={16} />
        <select
          aria-label={`Assign ${itemName}`}
          data-dirty={assignment !== initialAssignment}
          name="guestId"
          onChange={(event) => setAssignment(event.target.value)}
          value={assignment}
        >
          <option value="">Unassigned</option>
          {guests.map((guest) => (
            <option key={guest.id} value={guest.id}>
              {guest.name}
            </option>
          ))}
        </select>
        <SubmitButton
          aria-label={`Save assignment for ${itemName}`}
          className="icon-button"
          disabled={assignment === initialAssignment}
          pendingLabel="Saving…"
          title={`Save assignment for ${itemName}`}
        >
          <PackageCheck aria-hidden="true" size={16} />
        </SubmitButton>
      </MutationForm> : guestCanClaim ? (
        <MutationForm action={claimShoppingAction} className="inline-form">
          <input name="itemId" type="hidden" value={itemId} />
          <input name="guestId" type="hidden" value={guestId} />
          <SubmitButton className="button secondary small" pendingLabel="Claiming…">Claim item</SubmitButton>
        </MutationForm>
      ) : guestCanManage ? (
        <MutationForm action={claimShoppingAction} className="inline-form">
          <input name="itemId" type="hidden" value={itemId} />
          <SubmitButton className="button secondary small" pendingLabel="Releasing…">Release item</SubmitButton>
        </MutationForm>
      ) : null}
      {hostCanManage || guestCanManage ? <MutationForm action={toggleShoppingAction} className="inline-form">
        <input name="itemId" type="hidden" value={itemId} />
        <label className="checkbox-label">
          <input
            checked={purchased}
            data-dirty={purchased !== checked}
            name="checked"
            onChange={(event) => setPurchased(event.target.checked)}
            type="checkbox"
          />
          Purchased
        </label>
        <SubmitButton className="button secondary small" disabled={purchased === checked} pendingLabel="Saving…" title={`Save purchased state for ${itemName}`}>
          Save
        </SubmitButton>
      </MutationForm> : null}
    </>
  );
}
