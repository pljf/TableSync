import { deleteRoomAction } from "@/app/actions";
import { MutationForm } from "@/components/ui/mutation-form";
import { SubmitButton } from "@/components/ui/submit-button";

export function DeleteRoomControl({ roomId }: { roomId: string }) {
  return (
    <details className="card destructive-control">
      <summary>Delete room</summary>
      <p className="muted">Permanently delete this room, all guest preferences, menus, votes, and shopping progress. Invite and share links will stop working. This cannot be undone.</p>
      <MutationForm action={deleteRoomAction.bind(null, roomId)}>
        <label className="checkbox-label standalone">
          <input name="confirmDataLoss" type="checkbox" required />
          I understand that this room and all its data will be permanently deleted.
        </label>
        <SubmitButton className="button danger" pendingLabel="Deleting room...">
          Delete room permanently
        </SubmitButton>
      </MutationForm>
    </details>
  );
}
