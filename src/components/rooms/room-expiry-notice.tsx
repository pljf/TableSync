import { EventDateTime } from "@/components/ui/event-date-time";
import { ROOM_EVENT_GRACE_DAYS, ROOM_RETENTION_DAYS, roomExpiresAt } from "@/lib/room-retention";

export function RoomExpiryNotice({ createdAt, dateTime }: { createdAt?: string; dateTime?: string }) {
  return (
    <p className="muted room-expiry-notice">
      Rooms stay available for at least {ROOM_RETENTION_DAYS} days after creation or until {ROOM_EVENT_GRACE_DAYS} days after the gathering, whichever is later, then are automatically deleted.
      {createdAt ? <> Expires <EventDateTime value={roomExpiresAt(createdAt, dateTime).toISOString()} />.</> : null}
    </p>
  );
}
