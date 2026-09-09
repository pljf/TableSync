import type { Guest, Vote } from "@/lib/domain";

export function VetoReasons({
  guests = [],
  votes
}: {
  guests?: Pick<Guest, "id" | "name">[];
  votes: Vote[];
}) {
  const vetoes = votes.filter((vote) => vote.value === "VETO" && vote.reason?.trim());
  if (vetoes.length === 0) return null;
  const guestNames = new Map(guests.map((guest) => [guest.id, guest.name]));

  return (
    <section className="warning-list" aria-label="Veto explanations">
      <h4>Why guests vetoed this plan</h4>
      {vetoes.map((vote) => (
        <p key={vote.id}>
          <strong>{guestNames.get(vote.guestId) ?? "Guest"}:</strong> {vote.reason}
        </p>
      ))}
    </section>
  );
}
