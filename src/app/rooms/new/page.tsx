import { createRoomAction } from "@/app/actions";
import { requireHost } from "@/lib/auth";
import { eventTypeLabels } from "@/lib/format";
import { eventTypes } from "@/lib/seed-data";

export default async function NewRoomPage() {
  await requireHost();

  return (
    <section className="narrow-page wide">
      <form action={createRoomAction} className="card form-card">
        <div>
          <p className="eyebrow">New dinner</p>
          <h1>Create a room</h1>
        </div>
        <label>
          Title
          <input name="title" placeholder="Friday Hotpot Night" required />
        </label>
        <label>
          Description
          <textarea name="description" placeholder="Short context for guests" rows={3} />
        </label>
        <div className="form-grid">
          <label>
            Event type
            <select name="eventType" defaultValue="DINNER">
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {eventTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date and time
            <input name="dateTime" type="datetime-local" />
          </label>
          <label>
            Location
            <input name="location" placeholder="Apartment 4B" />
          </label>
          <label>
            Total budget
            <input name="totalBudgetDollars" min="1" step="1" type="number" placeholder="120" />
          </label>
          <label>
            Expected guests
            <input name="expectedGuests" min="2" max="50" type="number" defaultValue="6" required />
          </label>
          <label className="checkbox-label standalone">
            <input name="isPublicShareable" type="checkbox" />
            Public share page
          </label>
        </div>
        <button className="button full" type="submit">
          Create room
        </button>
      </form>
    </section>
  );
}

