import { ArrowUpRight, CalendarDays, Coffee, Flame, HandHeart, MapPin, Salad, ShoppingCart, Soup, TreePine, Users, Utensils } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { DinnerRoom } from "@/lib/domain";
import { eventTypeLabels, formatMoney } from "@/lib/format";
import { EventDateTime } from "@/components/ui/event-date-time";
import { StatusBadge } from "@/components/ui/status-badge";
import { roomExpiresAt } from "@/lib/room-retention";
import { roomPhoto } from "@/components/rooms/room-photo";

export function RoomCard({ room, guestCount, shoppingCount, featured = false, index = 0 }: {
  room: DinnerRoom; guestCount: number; shoppingCount: number; featured?: boolean; index?: number;
}) {
  const EventIcon = { DINNER: Utensils, HOTPOT: Soup, POTLUCK: HandHeart, BBQ: Flame, PICNIC: TreePine, BRUNCH: Coffee, OTHER: Salad }[room.eventType];
  const titleId = `room-title-${room.id}`;
  const photo = roomPhoto(room.eventType);

  return (
    <article className={`card room-card live-gathering-card${featured ? " is-featured" : ""}`} aria-labelledby={titleId} data-reveal data-delay={Math.min(index, 3) * 90}>
      <div className="live-gathering-photo">
        <Image src={photo.src} alt={photo.alt} width={700} height={460} sizes={featured ? "(max-width: 900px) 100vw, 55vw" : "(max-width: 760px) 100vw, 180px"} />
        <span className="live-occasion-label"><EventIcon aria-hidden="true" size={15} />{eventTypeLabels[room.eventType]}</span>
      </div>
      <div className="live-gathering-content">
      <div className="room-card-topline">
        <span className="live-gathering-index">{String(index + 1).padStart(2, "0")} / {featured ? "IN GOOD COMPANY" : "SAVE A SEAT"}</span>
        <StatusBadge status={room.status} />
      </div>
      <div className="room-card-title">
        <h3 id={titleId}><Link href={`/rooms/${room.id}`} prefetch={false}>{room.title}</Link></h3>
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
      </div>
    </article>
  );
}
