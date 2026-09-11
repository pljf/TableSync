import { ArrowUpRight, CalendarDays, Coffee, Flame, HandHeart, MapPin, Salad, ShoppingCart, Soup, TreePine, Users, Utensils } from "lucide-react";
import Link from "next/link";
import type { DinnerRoom } from "@/lib/domain";
import { eventTypeLabels, formatMoney } from "@/lib/format";
import { EventDateTime } from "@/components/ui/event-date-time";
import { StatusBadge } from "@/components/ui/status-badge";
import { roomExpiresAt } from "@/lib/room-retention";

export function RoomCard({ room, guestCount, shoppingCount }: { room: DinnerRoom; guestCount: number; shoppingCount: number }) {
  const EventIcon = { DINNER: Utensils, HOTPOT: Soup, POTLUCK: HandHeart, BBQ: Flame, PICNIC: TreePine, BRUNCH: Coffee, OTHER: Salad }[room.eventType];
  const titleId = `room-title-${room.id}`;

  return (
    <article className="card room-card">
      <div className="room-card-topline">
        <div className="room-card-event">
          <span className={`room-event-icon ${room.eventType.toLowerCase()}`}>
            <EventIcon aria-hidden="true" size={21} />
          </span>
          <span className="eyebrow">{eventTypeLabels[room.eventType]}</span>
        </div>
        <StatusBadge status={room.status} />
      </div>
      <div className="room-card-title">
        <h3 id={titleId}>{room.title}</h3>
        {room.description ? <p className="muted room-card-description">{room.description}</p> : null}
      </div>
      <dl className="room-card-details">
        <div>
          <dt><CalendarDays aria-hidden="true" size={17} />Date &amp; time</dt>
          <dd><EventDateTime value={room.dateTime} /></dd>
        </div>
        <div>
          <dt><MapPin aria-hidden="true" size={17} />Location</dt>
          <dd>{room.location || "Location TBD"}</dd>
        </div>
      </dl>
      <p className="muted room-expiry-notice">Expires <EventDateTime value={roomExpiresAt(room.createdAt).toISOString()} /></p>
      <div className="room-card-progress">
        <span>
          <Users aria-hidden="true" size={16} />
          {guestCount} {guestCount === 1 ? "guest" : "guests"}
        </span>
        <span>
          <ShoppingCart aria-hidden="true" size={16} />
          {shoppingCount} {shoppingCount === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="card-footer-row">
        <div className="room-card-budget"><span>Total budget</span><strong>{formatMoney(room.totalBudgetCents)}</strong></div>
        <Link aria-describedby={titleId} className="button secondary" href={`/rooms/${room.id}`} prefetch={false}>
          Open
          <ArrowUpRight aria-hidden="true" size={17} />
        </Link>
      </div>
    </article>
  );
}

