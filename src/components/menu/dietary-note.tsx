import { Info } from "lucide-react";

export function DietaryNote() {
  return (
    <aside className="dietary-note" aria-label="Checking dietary requirements">
      <Info aria-hidden="true" size={17} />
      <p>Menus match the ingredients and tags in our catalog. Confirm product labels, preparation, and cross-contact with your guests. Halal and Kosher requirements need confirmation beyond these ingredient checks.</p>
    </aside>
  );
}
