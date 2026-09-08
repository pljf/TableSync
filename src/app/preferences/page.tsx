import Link from "next/link";
import { notFound } from "next/navigation";
import { updateGuestPreferencesAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";
import { DietaryNote } from "@/components/menu/dietary-note";
import { GuestList } from "@/components/rooms/guest-list";
import { dietLabels, eventTypeLabels, spiceLabels } from "@/lib/format";
import { getCurrentGuestActor, getSavedGuestRooms } from "@/lib/guest-session";
import { getGuestPreferenceContext } from "@/lib/store";
import { canPerformWorkflowAction } from "@/lib/workflow/state-machine";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ saved?: string; updated?: string; roomId?: string }> | { saved?: string; updated?: string; roomId?: string };
};

export default async function GuestPreferencePage({ searchParams }: PageProps) {
  const query = searchParams ? await searchParams : {};
  const actor = await getCurrentGuestActor(query.roomId);
  if (!actor) {
    return (
      <section className="narrow-page">
        <article className="card empty-state">
          <p className="eyebrow">Meal preferences</p>
          <h1>Open your meal invitation</h1>
          <p className="muted">{query.roomId ? "No response for this room is saved in this browser. Open its invite link from the host to join." : "No meal response is active in this browser. Open the invite link from your host to join."} If you created the room, open it from your dashboard and choose Add my preferences.</p>
          <Link className="button" href="/dashboard" prefetch={false}>Go to dashboard</Link>
        </article>
      </section>
    );
  }
  const context = await getGuestPreferenceContext(actor);
  if (!context) notFound();
  const { guest, room } = context;
  const savedRooms = await getSavedGuestRooms();
  const canEdit = canPerformWorkflowAction(room.status, "UPDATE_PREFERENCES");

  return (
    <section className="narrow-page wide">
      <div className="page-stack compact-stack">
        {savedRooms.length > 1 ? <nav className="card" aria-label="Your meal responses">
          <p className="eyebrow">Your meal responses</p>
          <div className="button-row">{savedRooms.map((saved) => (
            <Link aria-current={saved.roomId === room.id ? "page" : undefined} className="button secondary small" href={`/preferences?roomId=${encodeURIComponent(saved.roomId)}`} key={saved.roomId} prefetch={false}>
              {saved.roomTitle} · {saved.guestName}
            </Link>
          ))}</div>
        </nav> : null}
        {query.saved === "1" && !query.updated ? <div className="feedback success-feedback" role="status">Preferences saved. This browser can securely update them until voting starts.</div> : null}
        {!canEdit ? (
          <article className="card empty-state">
            <p className="eyebrow">Preferences locked</p>
            <h1>Your preferences are saved</h1>
            <p className="muted">{room.title} has moved to voting or finalization, so responses can no longer be changed.</p>
            <GuestList guests={[guest]} hostCanManage={false} currentGuestId={guest.id} />
            <Link className="button secondary" href={`/rooms/${room.id}`} prefetch={false}>View room overview</Link>
          </article>
        ) : (
          <MutationForm action={updateGuestPreferencesAction} className="card form-card" key={`${room.id}:${guest.id}`}>
            <input name="roomId" type="hidden" value={room.id} />
            <div><p className="eyebrow">{eventTypeLabels[room.eventType]} - {room.title}</p><h1>Your preferences</h1><p className="muted">Review or update your response. Changes close when the host starts voting.</p></div>
            <div className="form-grid">
              <label>Name<input defaultValue={guest.name} maxLength={100} minLength={2} name="name" required /></label>
              <label>Email optional<input defaultValue={guest.email} maxLength={254} name="email" type="email" /></label>
              <label>Diet type<select defaultValue={guest.preference.dietType} name="dietType">{Object.entries(dietLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Spice tolerance<select defaultValue={guest.preference.spiceLevel} name="spiceLevel">{Object.entries(spiceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Allergies<input defaultValue={guest.preference.allergies.join(", ")} maxLength={2000} name="allergies" /></label>
              <label>Disliked ingredients<input defaultValue={guest.preference.dislikes.join(", ")} maxLength={2000} name="dislikes" /></label>
              <label>Liked ingredients<input defaultValue={guest.preference.likes.join(", ")} maxLength={2000} name="likes" /></label>
              <label>Budget comfort<input defaultValue={guest.preference.maxBudgetCents ? guest.preference.maxBudgetCents / 100 : undefined} min="1" name="maxBudgetDollars" step="1" type="number" /></label>
            </div>
            <DietaryNote />
            <label>Notes<textarea defaultValue={guest.preference.notes} maxLength={2000} name="notes" rows={3} /></label>
            <label className="checkbox-label standalone"><input defaultChecked={guest.canBring} name="canBring" type="checkbox" />I can bring groceries or food</label>
            {room.eventType === "POTLUCK" ? <p className="muted">Offering to bring food lets you claim a whole dish, or receive a dish assignment from the host, once the menu is finalized.</p> : null}
            <div className="button-row form-actions"><SubmitButton className="button" pendingLabel="Saving changes...">Save preferences</SubmitButton><Link className="button secondary" href={`/rooms/${room.id}`} prefetch={false}>View room overview</Link></div>
          </MutationForm>
        )}
      </div>
    </section>
  );
}
