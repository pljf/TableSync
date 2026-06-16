import { notFound } from "next/navigation";
import { joinRoomAction } from "@/app/actions";
import { dietLabels, eventTypeLabels, spiceLabels } from "@/lib/format";
import { getRoomByInviteToken } from "@/lib/store";

type PageProps = {
  params: Promise<{ token: string }> | { token: string };
};

export default async function JoinPage({ params }: PageProps) {
  const { token } = await params;
  const bundle = getRoomByInviteToken(token);
  if (!bundle) {
    notFound();
  }

  return (
    <section className="narrow-page wide">
      <form action={joinRoomAction.bind(null, token)} className="card form-card">
        <div>
          <p className="eyebrow">
            Join {eventTypeLabels[bundle.room.eventType].toLowerCase()} - {bundle.room.title}
          </p>
          <h1>Share your meal preferences</h1>
        </div>
        <div className="form-grid">
          <label>
            Name
            <input name="name" placeholder="Maya" required />
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
        <button className="button full" type="submit">
          Join room
        </button>
      </form>
    </section>
  );
}
