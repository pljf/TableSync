import Link from "next/link";
import { notFound } from "next/navigation";
import { updateGuestPreferencesAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";
import { dietLabels, eventTypeLabels, spiceLabels } from "@/lib/format";
import { requireGuestActor } from "@/lib/guest-session";
import { getGuestPreferenceContext } from "@/lib/store";
import { canPerformWorkflowAction } from "@/lib/workflow/state-machine";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ saved?: string; updated?: string }> | { saved?: string; updated?: string };
};

export default async function GuestPreferencePage({ searchParams }: PageProps) {
  const query = searchParams ? await searchParams : {};
  const actor = await requireGuestActor();
  const context = await getGuestPreferenceContext(actor);
  if (!context) notFound();
  const { guest, room } = context;
  const canEdit = canPerformWorkflowAction(room.status, "UPDATE_PREFERENCES");

  return (
    <section className="narrow-page wide">
      <div className="page-stack compact-stack">
        {query.saved === "1" || query.updated ? <div className="feedback success-feedback" role="status">Preferences saved. This browser can securely update them until voting starts.</div> : null}
        {!canEdit ? (
          <article className="card empty-state">
            <p className="eyebrow">Preferences locked</p>
            <h1>Your preferences are saved</h1>
            <p className="muted">{room.title} has moved to voting or finalization, so responses can no longer be changed.</p>
            <Link className="button secondary" href={`/rooms/${room.id}`} prefetch={false}>View room overview</Link>
          </article>
        ) : (
          <MutationForm action={updateGuestPreferencesAction} className="card form-card">
            <div><p className="eyebrow">{eventTypeLabels[room.eventType]} - {room.title}</p><h1>Your preferences</h1><p className="muted">Review or update your response. Changes close when the host starts voting.</p></div>
            <div className="form-grid">
              <label>Name<input defaultValue={guest.name} minLength={2} name="name" required /></label>
              <label>Email optional<input defaultValue={guest.email} name="email" type="email" /></label>
              <label>Diet type<select defaultValue={guest.preference.dietType} name="dietType">{Object.entries(dietLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Spice tolerance<select defaultValue={guest.preference.spiceLevel} name="spiceLevel">{Object.entries(spiceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Allergies<input defaultValue={guest.preference.allergies.join(", ")} name="allergies" /></label>
              <label>Disliked ingredients<input defaultValue={guest.preference.dislikes.join(", ")} name="dislikes" /></label>
              <label>Liked ingredients<input defaultValue={guest.preference.likes.join(", ")} name="likes" /></label>
              <label>Budget comfort<input defaultValue={guest.preference.maxBudgetCents ? guest.preference.maxBudgetCents / 100 : undefined} min="1" name="maxBudgetDollars" step="1" type="number" /></label>
            </div>
            <label>Notes<textarea defaultValue={guest.preference.notes} name="notes" rows={3} /></label>
            <label className="checkbox-label standalone"><input defaultChecked={guest.canBring} name="canBring" type="checkbox" />I can bring groceries or food</label>
            <div className="button-row form-actions"><SubmitButton className="button" pendingLabel="Saving changes...">Save preferences</SubmitButton><Link className="button secondary" href={`/rooms/${room.id}`} prefetch={false}>View room overview</Link></div>
          </MutationForm>
        )}
      </div>
    </section>
  );
}
