"use client";

import { useState } from "react";
import { assignPotluckContributionAction, setPotluckContributionReadyAction } from "@/app/actions";
import { MutationForm } from "@/components/ui/mutation-form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Guest } from "@/lib/domain";

function useSavedDraft<T extends string | boolean>(saved: T, ownerIdentity?: string) {
  const [draft, setDraft] = useState({ saved, value: saved, ownerIdentity });
  let current = draft;
  if (draft.ownerIdentity !== ownerIdentity || draft.saved !== saved) {
    current = { saved, value: draft.ownerIdentity !== ownerIdentity || draft.value === draft.saved ? saved : draft.value, ownerIdentity };
    setDraft(current);
  }
  return [current.value, (value: T) => setDraft({ saved, value, ownerIdentity })] as const;
}

function ShoppingChangeConfirmation({ required }: { required: boolean }) {
  return required ? (
    <label className="checkbox-label contribution-confirmation">
      <input name="confirmShoppingReset" required type="checkbox" />
      I understand ingredients no longer needed will be removed and increased quantities will need a new purchase check. Other progress is kept.
    </label>
  ) : null;
}

export function PotluckContributionControls({ menuPlanDishId, ownerId, ready, guests, guestId, isHost, hasShopping }: {
  menuPlanDishId: string;
  ownerId?: string;
  ready: boolean;
  guests: Pick<Guest, "id" | "name" | "canBring">[];
  guestId?: string;
  isHost: boolean;
  hasShopping: boolean;
}) {
  const [assignment, setAssignment] = useSavedDraft(ownerId ?? "");
  const [readyDraft, setReadyDraft] = useSavedDraft(ready, ownerId);
  const ownContribution = Boolean(guestId && ownerId === guestId);
  const canClaim = !ownerId && guests.some((guest) => guest.id === guestId && guest.canBring);

  return (
    <div className="contribution-controls">
      {isHost ? (
        <MutationForm action={assignPotluckContributionAction} className="contribution-form">
          <input name="menuPlanDishId" type="hidden" value={menuPlanDishId} />
          <label>
            Assign contribution
            <select data-dirty={assignment !== (ownerId ?? "")} name="guestId" value={assignment} onChange={(event) => setAssignment(event.target.value)}>
              <option value="">Shared groceries</option>
              {guests.filter((guest) => guest.canBring).map((guest) => <option key={guest.id} value={guest.id}>{guest.name}</option>)}
            </select>
          </label>
          <ShoppingChangeConfirmation required={hasShopping && Boolean(ownerId) !== Boolean(assignment)} />
          <SubmitButton className="button secondary small" disabled={assignment === (ownerId ?? "")} pendingLabel="Saving contribution…">Save contribution</SubmitButton>
        </MutationForm>
      ) : canClaim || ownContribution ? (
        <MutationForm action={assignPotluckContributionAction} className="contribution-form">
          <input name="menuPlanDishId" type="hidden" value={menuPlanDishId} />
          <input name="guestId" type="hidden" value={ownContribution ? "" : guestId} />
          <ShoppingChangeConfirmation required={hasShopping} />
          <SubmitButton className="button secondary small" pendingLabel={ownContribution ? "Releasing dish…" : "Claiming dish…"}>{ownContribution ? "Release dish" : "Claim dish"}</SubmitButton>
        </MutationForm>
      ) : null}
      {ownerId && (isHost || ownContribution) ? (
        <MutationForm action={setPotluckContributionReadyAction} className="contribution-form readiness-form">
          <input name="menuPlanDishId" type="hidden" value={menuPlanDishId} />
          <label className="checkbox-label">
            <input checked={readyDraft} data-dirty={readyDraft !== ready} name="ready" onChange={(event) => setReadyDraft(event.target.checked)} type="checkbox" />
            Ready to bring
          </label>
          <SubmitButton className="button secondary small" disabled={readyDraft === ready} pendingLabel="Saving readiness…">Save readiness</SubmitButton>
        </MutationForm>
      ) : null}
    </div>
  );
}
