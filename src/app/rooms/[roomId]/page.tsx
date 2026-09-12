import { ArrowLeft, CalendarDays, MapPin, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/rooms/activity-timeline";
import { ConstraintSummary } from "@/components/rooms/constraint-summary";
import { DeleteRoomControl } from "@/components/rooms/delete-room-control";
import { RoomExpiryNotice } from "@/components/rooms/room-expiry-notice";
import { RoomNavigation } from "@/components/rooms/room-navigation";
import { RoomNextStep } from "@/components/rooms/room-next-step";
import { RoomProgress } from "@/components/rooms/room-progress";
import { GuestList } from "@/components/rooms/guest-list";
import { InviteLink } from "@/components/rooms/invite-link";
import { EventDateTime } from "@/components/ui/event-date-time";
import { StatusBadge } from "@/components/ui/status-badge";
import { eventTypeLabels, formatMoney } from "@/lib/format";
import { eventFormats } from "@/lib/event-formats";
import { contributionSummary } from "@/lib/menu-presentation";
import { getRequestActors } from "@/lib/request-actors";
import { getRoomRevision } from "@/lib/room-revision";
import { getRoomBundle } from "@/lib/store";
import { canPerformWorkflowAction } from "@/lib/workflow/state-machine";
import { MotionScene } from "@/components/layout/motion-scene";
import { roomPhoto } from "@/components/rooms/room-photo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function RoomPage({ params }: PageProps) {
  const { roomId } = await params;
  const actors = await getRequestActors(roomId);
  const initialRevision = await getRoomRevision(roomId, actors);
  const bundle = await getRoomBundle(roomId, actors);
  if (!bundle) {
    notFound();
  }

  const finalPlan = bundle.plans.find((plan) => plan.status === "FINALIZED");
  const contributions = bundle.room.eventType === "POTLUCK" && finalPlan ? contributionSummary(finalPlan.dishes) : undefined;
  const isHost = actors.host?.userId === bundle.room.hostId;
  const invitePath = bundle.room.inviteToken ? `/join/${bundle.room.inviteToken}` : undefined;
  const shareAvailable = bundle.room.isPublicShareable && bundle.room.status === "FINALIZED" && Boolean(finalPlan);
  const photo = roomPhoto(bundle.room.eventType);

  return (
    <MotionScene className="page-stack live-room-overview" sceneKey={bundle.room.id}>
      {isHost ? <Link className="workspace-back" href="/dashboard" prefetch={false}><ArrowLeft size={16} aria-hidden="true" />My gatherings</Link> : null}
      <header className="live-room-header">
        <div>
          <p className="live-section-label">{eventTypeLabels[bundle.room.eventType]} · A place for everyone</p>
          <h1 data-reveal>{bundle.room.title}</h1>
          <p className="muted">{bundle.room.description || eventFormats[bundle.room.eventType].description}</p>
          <div className="button-row">
            <StatusBadge status={bundle.room.status} />
            {isHost && canPerformWorkflowAction(bundle.room.status, "UPDATE_ROOM_DETAILS") ? (
              <Link className="button secondary" href={`/rooms/${bundle.room.id}/edit`} prefetch={false}>Edit room</Link>
            ) : null}
          </div>
        </div>
        <div className="live-room-header-photo" data-reveal="photo">
          <Image src={photo.src} alt={photo.alt} width={420} height={340} sizes="(max-width: 760px) 1px, 220px" />
        </div>
      </header>

      <RoomExpiryNotice createdAt={bundle.room.createdAt} />
      <RoomProgress status={bundle.room.status} guestCount={bundle.guests.length} expectedGuests={bundle.room.expectedGuests} />
      <RoomNavigation active="overview" guestCanViewPreferences={actors.guest?.roomId === bundle.room.id} initialRevision={initialRevision ?? undefined} roomId={bundle.room.id} shareAvailable={shareAvailable} />
      <RoomNextStep room={bundle.room} guestCount={bundle.guests.length} planCount={bundle.plans.length} isHost={isHost} isRoomGuest={actors.guest?.roomId === bundle.room.id} finalPlanTitle={finalPlan?.title} shoppingCount={bundle.shopping.length} contributions={contributions} />

      <section className="metric-grid" aria-label="Gathering details" data-reveal>
        <article className="metric-card">
          <CalendarDays size={20} />
          <span>Date</span>
          <strong><EventDateTime value={bundle.room.dateTime} /></strong>
        </article>
        <article className="metric-card">
          <MapPin size={20} />
          <span>Location</span>
          <strong>{bundle.room.location || "TBD"}</strong>
        </article>
        <article className="metric-card">
          <Users size={20} />
          <span>Guests</span>
          <strong>{bundle.guests.length}</strong>
        </article>
        <article className="metric-card">
          <ShoppingCart size={20} />
          <span>Budget</span>
          <strong>{formatMoney(bundle.room.totalBudgetCents)}</strong>
        </article>
      </section>

      <div className="room-workspace">
        <div className="room-main">
          <ConstraintSummary guests={bundle.guests} eventType={bundle.room.eventType} />
          <article className="card">
            <h2 data-reveal>Guests</h2>
            <GuestList guests={bundle.guests} hostCanManage={isHost} currentGuestId={actors.guest?.roomId === bundle.room.id ? actors.guest.guestId : undefined} />
          </article>
        </div>
        <aside className="room-sidebar" aria-label="Invitations and activity">
          {isHost && invitePath ? <div id="room-invite"><InviteLink path={invitePath} /></div> : null}
          <article className="card" data-reveal>
            <h2>Activity</h2>
            <ActivityTimeline events={bundle.activities.slice(0, 6)} />
          </article>
        </aside>
      </div>
      {isHost ? <DeleteRoomControl roomId={bundle.room.id} /> : null}
    </MotionScene>
  );
}
