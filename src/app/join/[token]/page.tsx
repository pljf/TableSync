import { notFound } from "next/navigation";
import Link from "next/link";
import { joinRoomAction } from "@/app/actions";
import { dietLabels, eventTypeLabels, spiceLabels } from "@/lib/format";
import { getRoomByInviteToken } from "@/lib/store";
import { getCurrentGuestActor } from "@/lib/guest-session";
import { canPerformWorkflowAction } from "@/lib/workflow/state-machine";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";
import { DietaryNote } from "@/components/menu/dietary-note";
import { eventFormats } from "@/lib/event-formats";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }> | { token: string };
};

export default async function JoinPage({ params }: PageProps) {
  const { token } = await params;
  const submissionKey = crypto.randomUUID();
  const room = await getRoomByInviteToken(token);
  if (!room) {
    notFound();
  }
  const guest = await getCurrentGuestActor(room.id);
  const alreadyJoined = guest?.roomId === room.id;
  if (!canPerformWorkflowAction(room.status, "JOIN_ROOM")) {
    return (
      <section className="narrow-page">
        <article className="card empty-state">
          <p className="eyebrow">Guest preferences closed</p>
          <h1>{room.title} is no longer accepting responses</h1>
          <p className="muted">The host has moved this room to voting or finalized the menu.</p>
          {alreadyJoined ? <Link className="button secondary" href={`/rooms/${room.id}`} prefetch={false}>Return to your room</Link> : null}
        </article>
      </section>
    );
  }

  return (
    <section className="narrow-page wide">
      <MutationForm action={joinRoomAction.bind(null, token, submissionKey)} className="card form-card">
        <div>
          <p className="eyebrow">
            Join {eventTypeLabels[room.eventType].toLowerCase()} - {room.title}
          </p>
          <h1>Share your meal preferences</h1>
          <p className="muted">Help your host put together a meal you can enjoy. No account needed.</p>
          <p className="muted">{eventFormats[room.eventType].description}</p>
        </div>
        {alreadyJoined ? (
          <div className="feedback info-feedback">
            <p>A response for {guest.name} is already saved for this room in this browser. Update it instead of joining again. Submitting another response replaces your active response for this room; your other rooms stay available.</p>
            <Link className="button secondary" href={`/preferences?roomId=${encodeURIComponent(room.id)}`} prefetch={false}>Edit your saved preferences</Link>
          </div>
        ) : null}
        {!alreadyJoined ? <p className="muted">Responses you saved for other rooms stay available in this browser.</p> : null}
        <div className="form-grid">
          <label>
            Name
            <input maxLength={100} minLength={2} name="name" placeholder="Maya" required />
          </label>
          <label>
            Email optional
            <input maxLength={254} name="email" type="email" placeholder="maya@example.com" />
          </label>
          <label>
            Diet type
            <select name="dietType" defaultValue="OMNIVORE">
              {Object.entries(dietLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Spice tolerance
            <select name="spiceLevel" defaultValue="MEDIUM">
              {Object.entries(spiceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Allergies
            <input maxLength={2000} name="allergies" placeholder="peanut, shellfish" />
          </label>
          <label>
            Disliked ingredients
            <input maxLength={2000} name="dislikes" placeholder="seafood, pork" />
          </label>
          <label>
            Liked ingredients
            <input maxLength={2000} name="likes" placeholder="mushrooms, tofu, rice" />
          </label>
          <label>
            Budget comfort
            <input name="maxBudgetDollars" min="1" step="1" type="number" placeholder="20" />
          </label>
        </div>
        <DietaryNote />
        <label>
          Notes
          <textarea maxLength={2000} name="notes" rows={3} placeholder="Anything the host should know" />
        </label>
        <label className="checkbox-label standalone">
          <input name="canBring" type="checkbox" />
          I can bring groceries or food
        </label>
        {room.eventType === "POTLUCK" ? <p className="muted">Offering to bring food lets you claim a whole dish after the menu is finalized. Your host can also assign a dish to you. Ingredients and servings will already be planned.</p> : null}
        <SubmitButton className="button full" pendingLabel="Saving preferences...">
          Join room
        </SubmitButton>
      </MutationForm>
    </section>
  );
}
