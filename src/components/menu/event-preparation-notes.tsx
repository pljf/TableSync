import type { EventType } from "@/lib/domain";
import { eventFormats } from "@/lib/event-formats";

export function EventPreparationNotes({ eventType }: { eventType: EventType }) {
  const notes = eventFormats[eventType].preparationNotes;
  if (notes.length === 0) return null;

  return (
    <section aria-label="Preparation notes" className="event-preparation-notes">
      <h3>Preparation notes</h3>
      <ul className="muted">{notes.map((note) => <li key={note}>{note}</li>)}</ul>
    </section>
  );
}
