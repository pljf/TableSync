import { CircleDot } from "lucide-react";
import type { ActivityEvent } from "@/lib/domain";
import { activityLabels } from "@/lib/format";
import { EventDateTime } from "@/components/ui/event-date-time";

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.id}>
          <CircleDot size={16} />
          <div>
            <strong>{activityLabels[event.type]}</strong>
            <p>{event.message}</p>
            <span><EventDateTime value={event.createdAt} /></span>
          </div>
        </li>
      ))}
    </ol>
  );
}

