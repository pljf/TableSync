import { CircleDot } from "lucide-react";
import type { ActivityEvent } from "@/lib/domain";
import { activityLabels, formatDate } from "@/lib/format";

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.id}>
          <CircleDot size={16} />
          <div>
            <strong>{activityLabels[event.type]}</strong>
            <p>{event.message}</p>
            <span>{formatDate(event.createdAt)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

