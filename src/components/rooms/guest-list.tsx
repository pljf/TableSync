import type { Guest } from "@/lib/domain";
import { dietLabels, formatMoney, spiceLabels } from "@/lib/format";

export function GuestList({
  guests,
  hostCanManage,
  currentGuestId
}: {
  guests: Guest[];
  hostCanManage: boolean;
  currentGuestId?: string;
}) {
  if (guests.length === 0) {
    return <p className="muted">No guests have joined yet. Share the invite link to collect preferences.</p>;
  }

  return (
    <div className="guest-list">
      {guests.map((guest) => (
        <div key={guest.id}>
          <div className="guest-row">
            <div className="guest-identity"><span className="guest-avatar" aria-hidden="true">{guest.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><strong>{guest.name}</strong></div>
            <span>{dietLabels[guest.preference.dietType]}</span>
          </div>
          {hostCanManage || currentGuestId === guest.id ? (
            <details>
              <summary>Food preferences for {guest.name}</summary>
              <p><strong>Allergies:</strong> {guest.preference.allergies.join(", ") || "None recorded"}</p>
              <p><strong>Dislikes:</strong> {guest.preference.dislikes.join(", ") || "None recorded"}</p>
              <p><strong>Likes:</strong> {guest.preference.likes.join(", ") || "None recorded"}</p>
              <p><strong>Spice tolerance:</strong> {spiceLabels[guest.preference.spiceLevel]}</p>
              <p><strong>Budget comfort:</strong> {formatMoney(guest.preference.maxBudgetCents)}</p>
              <p><strong>Can bring groceries or food:</strong> {guest.canBring ? "Yes" : "No"}</p>
              {guest.preference.notes ? <p><strong>Notes for the host:</strong> {guest.preference.notes}</p> : null}
            </details>
          ) : null}
        </div>
      ))}
    </div>
  );
}
