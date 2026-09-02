import { notFound } from "next/navigation";
import { joinRoomAction } from "@/app/actions";
import { dietLabels, eventTypeLabels, spiceLabels } from "@/lib/format";
import { getRoomByInviteToken } from "@/lib/store";
import { canPerformWorkflowAction } from "@/lib/workflow/state-machine";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";

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
  if (!canPerformWorkflowAction(room.status, "JOIN_ROOM")) {
    return (
      <section className="narrow-page">
        <article className="card empty-state">
          <p className="eyebrow">Guest preferences closed</p>
          <h1>{room.title} is no longer accepting responses</h1>
          <p className="muted">The host has moved this room to voting or finalized the menu.</p>
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
        </div>
        <div className="form-grid">
          <label>
            Name
            <input minLength={2} name="name" placeholder="Maya" required />
          </label>
          <label>
            Email optional
            <input name="email" type="email" placeholder="maya@example.com" />
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
            <input name="allergies" placeholder="peanut, shellfish" />
          </label>
          <label>
            Disliked ingredients
            <input name="dislikes" placeholder="seafood, pork" />
          </label>
          <label>
            Liked ingredients
            <input name="likes" placeholder="mushrooms, tofu, rice" />
          </label>
          <label>
            Budget comfort
            <input name="maxBudgetDollars" min="1" step="1" type="number" placeholder="20" />
          </label>
        </div>
        <label>
          Notes
          <textarea name="notes" rows={3} placeholder="Anything the host should know" />
        </label>
        <label className="checkbox-label standalone">
          <input name="canBring" type="checkbox" />
          I can bring groceries or food
        </label>
        <SubmitButton className="button full" pendingLabel="Saving preferences...">
          Join room
        </SubmitButton>
      </MutationForm>
    </section>
  );
}
