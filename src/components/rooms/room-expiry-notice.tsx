import { EventDateTime } from "@/components/ui/event-date-time";
import { ROOM_RETENTION_DAYS, roomExpiresAt } from "@/lib/room-retention";

export function RoomExpiryNotice({ createdAt }: { createdAt?: string }) {
  return (
    <p className="muted room-expiry-notice">
      Rooms expire {ROOM_RETENTION_DAYS} days after creation and are automatically deleted.
      {createdAt ? <> Expires <EventDateTime value={roomExpiresAt(createdAt).toISOString()} />.</> : null}
    </p>
  );
}
