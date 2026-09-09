import { Check } from "lucide-react";
import type { RoomStatus } from "@/lib/domain";

const stages = ["Preferences", "Menu & voting", "Shopping"] as const;

const currentStage: Record<RoomStatus, number | null> = {
  DRAFT: 0,
  COLLECTING_PREFERENCES: 0,
  PLANNING: 1,
  VOTING: 1,
  FINALIZED: 2,
  ARCHIVED: null
};

export function RoomProgress({
  status,
  guestCount,
  expectedGuests
}: {
  status: RoomStatus;
  guestCount: number;
  expectedGuests?: number;
}) {
  const activeStage = currentStage[status];
  const responseCount = expectedGuests === undefined
    ? `${guestCount} ${guestCount === 1 ? "guest has" : "guests have"} shared preferences`
    : `${guestCount} of ${Math.max(expectedGuests, guestCount)} guests have shared preferences`;

  return (
    <section aria-label="Room progress" className="room-progress">
      <div className="room-progress-heading">
        <strong>Room progress</strong>
        <p>{activeStage === null ? "Archived room · no active step" : responseCount}</p>
      </div>
      <ol className="room-progress-steps" role="list">
        {stages.map((label, index) => {
          const state = activeStage === null ? "inactive" : index < activeStage ? "complete" : index === activeStage ? "current" : "upcoming";
          const stateLabel = state === "complete" ? "Completed" : state === "current" ? "Current step" : state === "upcoming" ? "Up next" : "Inactive";

          return (
            <li aria-current={state === "current" ? "step" : undefined} className={`room-progress-step is-${state}`} key={label}>
              <span aria-hidden="true" className="room-progress-marker">
                {state === "complete" ? <Check size={15} strokeWidth={2.5} /> : index + 1}
              </span>
              <span className="room-progress-copy">
                <strong>{label}</strong>
                <span>{stateLabel}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
