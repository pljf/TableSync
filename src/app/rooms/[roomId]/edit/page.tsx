import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRoomDetailsAction } from "@/app/actions";
import { DateTimeInput } from "@/components/ui/date-time-input";
import { MutationForm } from "@/components/ui/mutation-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EventFormatSelect } from "@/components/rooms/event-format-select";
import { requireHostActor } from "@/lib/request-actors";
import { getRoomBundle } from "@/lib/store";
import { canPerformWorkflowAction } from "@/lib/workflow/state-machine";

export const dynamic = "force-dynamic";

export default async function EditRoomPage({ params }: { params: Promise<{ roomId: string }> | { roomId: string } }) {
  const { roomId } = await params;
  const host = await requireHostActor();
  const bundle = await getRoomBundle(roomId, { host });
  if (!bundle) notFound();
  const { room } = bundle;

  if (!canPerformWorkflowAction(room.status, "UPDATE_ROOM_DETAILS")) {
    return (
      <section className="narrow-page">
        <article className="card empty-state">
          <h1>Room details are locked</h1>
          <p className="muted">Reopen guest preferences from the plans page before changing the room. If the menu is finalized, undo finalization first.</p>
          <Link className="button secondary" href={`/rooms/${roomId}/plans`} prefetch={false}>Open plans</Link>
        </article>
      </section>
    );
  }

  return (
    <section className="narrow-page wide">
      <MutationForm action={updateRoomDetailsAction.bind(null, roomId)} className="card form-card">
        <div>
          <p className="eyebrow">{room.title}</p>
          <h1>Edit room</h1>
          <p className="muted">Update the gathering details before generating plans. Guest responses stay saved.</p>
        </div>
        <label>Title<input defaultValue={room.title} maxLength={120} minLength={2} name="title" required /></label>
        <label>Description<textarea defaultValue={room.description} maxLength={2000} name="description" rows={3} /></label>
        <div className="form-grid room-details-grid">
          <EventFormatSelect value={room.eventType} />
          <label>Date and time<DateTimeInput value={room.dateTime} /></label>
          <label>Location<input defaultValue={room.location} maxLength={200} name="location" /></label>
          <label>Total budget<input defaultValue={room.totalBudgetCents === undefined ? undefined : room.totalBudgetCents / 100} max="1000000" min="1" name="totalBudgetDollars" step="0.01" type="number" /></label>
          <label>Expected guests<input defaultValue={room.expectedGuests ?? 6} max="50" min="2" name="expectedGuests" required type="number" /></label>
          <label className="checkbox-label standalone"><input defaultChecked={room.isPublicShareable} name="isPublicShareable" type="checkbox" />Public share page</label>
        </div>
        <div className="button-row form-actions">
          <SubmitButton className="button" pendingLabel="Saving room...">Save room details</SubmitButton>
          <Link className="button secondary" href={`/rooms/${roomId}`} prefetch={false}>Cancel</Link>
        </div>
      </MutationForm>
    </section>
  );
}
