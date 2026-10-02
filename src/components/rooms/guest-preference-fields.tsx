import { DietaryNote } from "@/components/menu/dietary-note";
import { OptionalCreationFields } from "@/components/rooms/optional-creation-fields";
import type { EventType } from "@/lib/domain";
import { dietLabels, spiceLabels } from "@/lib/format";

export function GuestPreferenceFields({ name, email, eventType, progressive = false }: {
  name?: string;
  email?: string;
  eventType?: EventType;
  progressive?: boolean;
}) {
  const nameField = (
    <label>
      Name
      <input defaultValue={name} maxLength={100} minLength={2} name="name" placeholder="Maya" required />
    </label>
  );
  const emailField = (
    <label>
      Email optional
      <input defaultValue={email} maxLength={254} name="email" type="email" placeholder="maya@example.com" />
    </label>
  );
  const dietField = (
    <label>
      Diet type
      <select name="dietType" defaultValue="OMNIVORE">
        {Object.entries(dietLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
  const spiceField = (
    <label>
      Spice tolerance
      <select name="spiceLevel" defaultValue="MEDIUM">
        {Object.entries(spiceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
  const allergiesField = (
    <label>
      Allergies
      <input maxLength={2000} name="allergies" placeholder="peanut, shellfish" />
    </label>
  );
  const dislikesField = (
    <label>
      Disliked ingredients
      <input maxLength={2000} name="dislikes" placeholder="seafood, pork" />
    </label>
  );
  const likesField = (
    <label>
      Liked ingredients
      <input maxLength={2000} name="likes" placeholder="mushrooms, tofu, rice" />
    </label>
  );
  const budgetField = (
    <label>
      Budget comfort
      <input max="1000000" name="maxBudgetDollars" min="0.01" step="0.01" type="number" placeholder="20" />
    </label>
  );
  const notesField = (
    <label>
      Notes
      <textarea maxLength={2000} name="notes" rows={3} placeholder="Anything to keep in mind for your meal" />
    </label>
  );
  const contributionField = (
    <>
      <label className="checkbox-label standalone">
        <input name="canBring" type="checkbox" />
        I can bring groceries or food
      </label>
      {eventType === "POTLUCK" ? <p className="muted">Offering to bring food lets you claim a whole dish after the menu is finalized. Your host can also assign a dish to you. Ingredients and servings will already be planned.</p> : null}
    </>
  );

  if (progressive) {
    return (
      <>
        <div className="form-grid">
          {nameField}
          {dietField}
          {allergiesField}
          {spiceField}
        </div>
        <DietaryNote />
        <OptionalCreationFields title="Favorites, budget comfort & more" section="preferences">
          <div className="form-grid">
            {emailField}
            {dislikesField}
            {likesField}
            {budgetField}
          </div>
          {notesField}
          {contributionField}
        </OptionalCreationFields>
      </>
    );
  }

  return (
    <>
      <div className="form-grid">
        {nameField}
        {emailField}
        {dietField}
        {spiceField}
        {allergiesField}
        {dislikesField}
        {likesField}
        {budgetField}
      </div>
      <DietaryNote />
      {notesField}
      {contributionField}
    </>
  );
}
