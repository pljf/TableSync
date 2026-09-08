import { createRoomAction } from "@/app/actions";
import { requireHost } from "@/lib/auth";
import { EventFormatSelect } from "@/components/rooms/event-format-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";
import { DateTimeInput } from "@/components/ui/date-time-input";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewRoomPage() {
  await requireHost();

  return (
    <section className="narrow-page wide">
      <MutationForm action={createRoomAction} className="card form-card">
        <div>
          <p className="eyebrow">New gathering</p>
          <h1>Create a room</h1>
          <p className="muted">A good meal starts with a little planning. Set the scene, then invite your people.</p>
        </div>
        <label>
          Title
          <input maxLength={120} minLength={2} name="title" placeholder="Friday Hotpot Night" required />
        </label>
        <label>
          Description
          <textarea maxLength={2000} name="description" placeholder="Short context for guests" rows={3} />
        </label>
        <div className="form-grid room-details-grid">
          <EventFormatSelect />
          <label>
            Date and time
            <DateTimeInput />
          </label>
          <label>
            Location
            <input maxLength={200} name="location" placeholder="Apartment 4B" />
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
        <div className="button-row form-actions">
          <SubmitButton className="button" pendingLabel="Creating room...">
            Create room
          </SubmitButton>
          <Link className="button secondary" href="/dashboard" prefetch={false}>
            Cancel
          </Link>
        </div>
      </MutationForm>
    </section>
  );
}

