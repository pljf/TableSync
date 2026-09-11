import { notFound } from "next/navigation";
import Link from "next/link";
import { joinRoomAction } from "@/app/actions";
import { eventTypeLabels } from "@/lib/format";
import { getRoomByInviteToken } from "@/lib/store";
import { getCurrentGuestActor } from "@/lib/guest-session";
import { canPerformWorkflowAction } from "@/lib/workflow/state-machine";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";
import { GuestPreferenceFields } from "@/components/rooms/guest-preference-fields";
import { RoomExpiryNotice } from "@/components/rooms/room-expiry-notice";
import { eventFormats } from "@/lib/event-formats";

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
  const guest = await getCurrentGuestActor(room.id);
  const alreadyJoined = guest?.roomId === room.id;
  if (!canPerformWorkflowAction(room.status, "JOIN_ROOM")) {
    return (
      <section className="narrow-page">
        <article className="card empty-state">
          <p className="eyebrow">Guest preferences closed</p>
          <h1>{room.title} is no longer accepting responses</h1>
          <p className="muted">The host has moved this room to voting or finalized the menu.</p>
          <RoomExpiryNotice createdAt={room.createdAt} />
          {alreadyJoined ? <Link className="button secondary" href={`/rooms/${room.id}`} prefetch={false}>Return to your room</Link> : null}
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
          <p className="muted">Help your host put together a meal you can enjoy. No account needed.</p>
          <p className="muted">{eventFormats[room.eventType].description}</p>
          <RoomExpiryNotice createdAt={room.createdAt} />
        </div>
        {alreadyJoined ? (
          <div className="feedback info-feedback">
            <p>A response for {guest.name} is already saved for this room in this browser. Update it instead of joining again. Submitting another response replaces your active response for this room; your other rooms stay available.</p>
            <Link className="button secondary" href={`/preferences?roomId=${encodeURIComponent(room.id)}`} prefetch={false}>Edit your saved preferences</Link>
          </div>
        ) : null}
        {!alreadyJoined ? <p className="muted">Responses you saved for other rooms stay available in this browser.</p> : null}
        <GuestPreferenceFields eventType={room.eventType} />
        <SubmitButton className="button full" pendingLabel="Saving preferences...">
          Join room
        </SubmitButton>
      </MutationForm>
    </section>
  );
}
