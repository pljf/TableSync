"use client";

import { useId, useState } from "react";
import type { EventType } from "@/lib/domain";
import { eventFormats } from "@/lib/event-formats";
import { eventTypeLabels } from "@/lib/format";

const formats: EventType[] = ["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"];

export function EventFormatSelect({ value = "DINNER" }: { value?: EventType }) {
  const [selected, setSelected] = useState(value);
  const descriptionId = useId();
  const format = eventFormats[selected];

  return (
    <div className="event-format-field">
      <label>
        Event type
        <select aria-describedby={descriptionId} defaultValue={value} name="eventType" onChange={(event) => setSelected(event.target.value as EventType)}>
          {formats.map((type) => <option key={type} value={type}>{eventTypeLabels[type]}</option>)}
        </select>
      </label>
      <div className="event-format-description" id={descriptionId} aria-live="polite">
        <p>{format.description}</p>
        <p><strong>On the menu:</strong> {format.structure}</p>
        {selected === "POTLUCK" ? <p>The total food budget includes contributed dishes. Guests can take a whole dish after the menu is finalized.</p> : null}
      </div>
    </div>
  );
}
