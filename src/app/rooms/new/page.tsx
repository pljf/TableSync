import { createRoomAction } from "@/app/actions";
import { requireHost } from "@/lib/auth";
import { EventFormatSelect } from "@/components/rooms/event-format-select";
import { GuestPreferenceFields } from "@/components/rooms/guest-preference-fields";
import { RoomExpiryNotice } from "@/components/rooms/room-expiry-notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";
import { DateTimeInput } from "@/components/ui/date-time-input";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { MotionScene } from "@/components/layout/motion-scene";
import { photoForDish } from "@/lib/photo-library";

export const dynamic = "force-dynamic";

export default async function NewRoomPage() {
  const host = await requireHost();
  const photo = photoForDish("table-preparation");

  return (
    <MotionScene className="page-stack live-new-room" sceneKey="new-room">
      <Link className="workspace-back" href="/dashboard" prefetch={false}><ArrowLeft size={16} aria-hidden="true" />My gatherings</Link>
      <div className="live-new-room-layout">
      <header className="live-new-room-intro" data-reveal>
        <p className="live-section-label">Make room for the good times</p>
        <h1>Something good<br /><em>starts here.</em></h1>
        <p>Pick a day, bring your people, and give your next gathering a home.</p>
        <Image src={photo.src} alt={photo.alt} width={600} height={500} sizes="(max-width: 900px) 1px, 40vw" />
      </header>
      <div className="live-new-room-fields" data-reveal data-delay="130">
      <MutationForm action={createRoomAction} className="card form-card live-new-room-form">
        <div>
          <p className="eyebrow">New gathering</p>
          <h2>Create a room</h2>
          <p className="muted">Set the scene and share your meal preferences, then invite your people.</p>
          <RoomExpiryNotice />
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
          <div>
            <label>
              Expected guests
              <input aria-describedby="expected-guests-help" name="expectedGuests" min="2" max="50" type="number" defaultValue="6" required />
            </label>
            <p className="muted" id="expected-guests-help">Include yourself in the guest count.</p>
          </div>
          <label className="checkbox-label standalone">
            <input name="isPublicShareable" type="checkbox" />
            Public share page
          </label>
        </div>
        <div>
          <h2>Your meal preferences</h2>
          <p className="muted">You are part of the meal too. Your diet, allergies, and preferences will be saved with the room and included when planning menus.</p>
        </div>
        <GuestPreferenceFields name={host.isAnonymous ? undefined : host.name} email={host.isAnonymous ? undefined : host.email} />
        <div className="button-row form-actions">
          <SubmitButton className="button" pendingLabel="Creating room...">
            Create room
          </SubmitButton>
          <Link className="button secondary" href="/dashboard" prefetch={false}>
            Cancel
          </Link>
        </div>
      </MutationForm>
      </div>
      </div>
    </MotionScene>
  );
}

