import { createRoomAction } from "@/app/actions";
import { requireHost } from "@/lib/auth";
import { EventFormatSelect } from "@/components/rooms/event-format-select";
import { GuestPreferenceFields } from "@/components/rooms/guest-preference-fields";
import { OptionalCreationFields } from "@/components/rooms/optional-creation-fields";
import { RoomExpiryNotice } from "@/components/rooms/room-expiry-notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";
import { DateTimeInput } from "@/components/ui/date-time-input";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { MotionScene } from "@/components/layout/motion-scene";
import { photoForDish } from "@/lib/photo-library";
import { creationAuthHref, creationEventType } from "@/lib/creation-intent";
import "@/app/simple-creation.css";

export const dynamic = "force-dynamic";

export default async function NewRoomPage({ searchParams }: {
  searchParams?: Promise<{ eventType?: string | string[] }>;
}) {
  const query = searchParams ? await searchParams : {};
  const eventType = creationEventType(query.eventType);
  const host = await requireHost(creationAuthHref(eventType));
  const photo = photoForDish("table-preparation");

  return (
    <MotionScene className="page-stack live-new-room" sceneKey="new-room">
      <Link className="workspace-back" href="/dashboard" prefetch={false}><ArrowLeft size={16} aria-hidden="true" />My gatherings</Link>
      <div className="live-new-room-layout">
        <header className="live-new-room-intro" data-reveal>
          <p className="live-section-label">Make room for the good times</p>
          <h1>Something good<br /><em>starts here.</em></h1>
          <p>Start with the essentials. Add the little details whenever you’re ready.</p>
          <Image src={photo.src} alt={photo.alt} width={600} height={500} sizes="(max-width: 900px) 1px, 40vw" />
        </header>
        <div className="live-new-room-fields">
          <MutationForm action={createRoomAction} className="card form-card live-new-room-form">
            <div>
              <h2>Create a room</h2>
              <p className="muted">Give your gathering a home, then invite your people. Optional details can be added later.</p>
              <RoomExpiryNotice />
            </div>
            <section className="creation-section" aria-labelledby="gathering-essentials">
              <h3 id="gathering-essentials">Gathering essentials</h3>
              <label>
                Title
                <input maxLength={120} minLength={2} name="title" placeholder="Friday Hotpot Night" required />
              </label>
              <div className="form-grid room-details-grid">
                <EventFormatSelect value={eventType} />
                <div>
                  <label>
                    Expected guests
                    <input aria-describedby="expected-guests-help" name="expectedGuests" min="2" max="50" type="number" defaultValue="6" required />
                  </label>
                  <p className="muted" id="expected-guests-help">Include yourself in the guest count.</p>
                </div>
                <label>
                  Date and time
                  <DateTimeInput />
                </label>
                <label>
                  Total budget
                  <input name="totalBudgetDollars" min="1" step="1" type="number" placeholder="120" />
                </label>
              </div>
              <OptionalCreationFields title="Location, description & sharing" section="gathering">
                <label>
                  Location
                  <input maxLength={200} name="location" placeholder="Apartment 4B" />
                </label>
                <label>
                  Description
                  <textarea maxLength={2000} name="description" placeholder="Short context for guests" rows={3} />
                </label>
                <label className="checkbox-label standalone">
                  <input name="isPublicShareable" type="checkbox" />
                  Public share page
                </label>
              </OptionalCreationFields>
            </section>
            <section className="creation-section" aria-labelledby="creator-preferences">
              <div>
                <h2 id="creator-preferences">Your meal preferences</h2>
                <p className="muted">Include your own dietary needs so the menu works for you too. You can refine the rest later.</p>
              </div>
              <GuestPreferenceFields progressive name={host.isAnonymous ? undefined : host.name} email={host.isAnonymous ? undefined : host.email} eventType={eventType} />
            </section>
            <div className="button-row form-actions">
              <SubmitButton className="button" pendingLabel="Creating room...">Create room</SubmitButton>
              <Link className="button secondary" href="/dashboard" prefetch={false}>Cancel</Link>
            </div>
          </MutationForm>
        </div>
      </div>
    </MotionScene>
  );
}
