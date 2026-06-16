import { CalendarDays, ClipboardCopy, MapPin, ShoppingCart, Users, Vote } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/rooms/activity-timeline";
import { ConstraintSummary } from "@/components/rooms/constraint-summary";
import { StatusBadge } from "@/components/ui/status-badge";
import { eventTypeLabels, formatDate, formatMoney } from "@/lib/format";
import { getRoomBundle } from "@/lib/store";

type PageProps = {
  params: Promise<{ roomId: string }> | { roomId: string };
};

export default async function RoomPage({ params }: PageProps) {
  const { roomId } = await params;
  const bundle = getRoomBundle(roomId);
  if (!bundle) {
    notFound();
  }

  const finalPlan = bundle.plans.find((plan) => plan.status === "FINALIZED");
  const invitePath = `/join/${bundle.room.inviteToken}`;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">{eventTypeLabels[bundle.room.eventType]}</p>
          <h1>{bundle.room.title}</h1>
          <p className="muted">{bundle.room.description}</p>
        </div>
        <StatusBadge status={bundle.room.status} />
      </header>

      <nav className="tab-nav" aria-label="Room sections">
        <Link href={`/rooms/${bundle.room.id}`}>Overview</Link>
        <Link href={`/rooms/${bundle.room.id}/plans`}>Plans</Link>
        <Link href={`/rooms/${bundle.room.id}/shopping`}>Shopping</Link>
        <Link href={`/share/${bundle.room.id}`}>Share</Link>
      </nav>

      <section className="metric-grid">
        <article className="metric-card">
          <CalendarDays size={20} />
          <span>Date</span>
          <strong>{formatDate(bundle.room.dateTime)}</strong>
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

      <section className="grid two">
        <article className="card">
          <div className="section-title">
            <ClipboardCopy size={18} />
            <h2>Invite link</h2>
          </div>
          <code className="invite-code">{invitePath}</code>
          <Link className="button secondary" href={invitePath}>
            Open guest form
          </Link>
        </article>
        <article className="card">
          <div className="section-title">
            <Vote size={18} />
            <h2>Decision state</h2>
          </div>
          <p className="muted">
            {finalPlan
              ? `${finalPlan.title} is finalized with ${bundle.shopping.length} shopping items.`
              : `${bundle.plans.length} plans are ready for voting.`}
          </p>
          <div className="button-row">
            <Link className="button secondary" href={`/rooms/${bundle.room.id}/plans`}>
              Review plans
            </Link>
            <Link className="button secondary" href={`/rooms/${bundle.room.id}/shopping`}>
              Open shopping
            </Link>
          </div>
        </article>
      </section>

      <ConstraintSummary guests={bundle.guests} />

      <section className="grid two">
        <article className="card">
          <h2>Guests</h2>
          <div className="guest-list">
            {bundle.guests.map((guest) => (
              <div className="guest-row" key={guest.id}>
                <strong>{guest.name}</strong>
                <span>{guest.preference.dietType.replaceAll("_", " ").toLowerCase()}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="card">
          <h2>Activity</h2>
          <ActivityTimeline events={bundle.activities.slice(0, 6)} />
        </article>
      </section>
    </div>
  );
}

