import { CalendarDays, MapPin, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";
import type { DinnerRoom } from "@/lib/domain";
import { eventTypeLabels, formatDate, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";

export function RoomCard({ room, guestCount, shoppingCount }: { room: DinnerRoom; guestCount: number; shoppingCount: number }) {
  return (
    <article className="card room-card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">{eventTypeLabels[room.eventType]}</p>
          <h3>{room.title}</h3>
        </div>
        <StatusBadge status={room.status} />
      </div>
      <p className="muted">{room.description || "No description yet."}</p>
      <div className="metric-grid compact">
        <span>
          <CalendarDays size={16} />
          {formatDate(room.dateTime)}
        </span>
        <span>
          <MapPin size={16} />
          {room.location || "Location TBD"}
        </span>
        <span>
          <Users size={16} />
          {guestCount} guests
        </span>
        <span>
          <ShoppingCart size={16} />
          {shoppingCount} items
        </span>
      </div>
      <div className="card-footer-row">
        <strong>{formatMoney(room.totalBudgetCents)}</strong>
        <Link className="button secondary" href={`/rooms/${room.id}`}>
          Open
        </Link>
      </div>
    </article>
  );
}

