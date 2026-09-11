import { DietaryNote } from "@/components/menu/dietary-note";
import type { EventType } from "@/lib/domain";
import { dietLabels, spiceLabels } from "@/lib/format";

export function GuestPreferenceFields({
  name,
  email,
  eventType
}: {
  name?: string;
  email?: string;
  eventType?: EventType;
}) {
  return (
    <>
      <div className="form-grid">
        <label>
          Name
          <input defaultValue={name} maxLength={100} minLength={2} name="name" placeholder="Maya" required />
        </label>
        <label>
          Email optional
          <input defaultValue={email} maxLength={254} name="email" type="email" placeholder="maya@example.com" />
        </label>
        <label>
          Diet type
          <select name="dietType" defaultValue="OMNIVORE">
            {Object.entries(dietLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Spice tolerance
          <select name="spiceLevel" defaultValue="MEDIUM">
            {Object.entries(spiceLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
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
        <textarea maxLength={2000} name="notes" rows={3} placeholder="Anything to keep in mind for your meal" />
      </label>
      <label className="checkbox-label standalone">
        <input name="canBring" type="checkbox" />
        I can bring groceries or food
      </label>
      {eventType === "POTLUCK" ? <p className="muted">Offering to bring food lets you claim a whole dish after the menu is finalized. Your host can also assign a dish to you. Ingredients and servings will already be planned.</p> : null}
    </>
  );
}
