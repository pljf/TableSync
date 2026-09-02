import { Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { generatePlansAction, reopenPreferencesAction, undoFinalizationAction } from "@/app/actions";
import { MenuPlanCard } from "@/components/menu/menu-plan-card";
import { NoSolutionPanel } from "@/components/menu/no-solution-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRequestActors } from "@/lib/request-actors";
import { getRoomBundle } from "@/lib/store";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ roomId: string }> | { roomId: string };
};

export default async function RoomPlansPage({ params }: PageProps) {
  const { roomId } = await params;
  const actors = await getRequestActors();
  const bundle = await getRoomBundle(roomId, actors, { allowPublicDemo: true });
  if (!bundle) {
    notFound();
  }
  const isHost = actors.host?.userId === bundle.room.hostId;
  const canGenerate = ["COLLECTING_PREFERENCES", "PLANNING"].includes(bundle.room.status);
  const canVote = bundle.room.status === "VOTING" && actors.guest?.roomId === bundle.room.id;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Menu plans</p>
          <h1>{bundle.room.title}</h1>
        </div>
        <StatusBadge status={bundle.room.status} />
      </header>
      <nav className="tab-nav" aria-label="Room sections">
        <Link href={`/rooms/${bundle.room.id}`} prefetch={false}>Overview</Link>
        <Link href={`/rooms/${bundle.room.id}/plans`} prefetch={false}>Plans</Link>
        <Link href={`/rooms/${bundle.room.id}/shopping`} prefetch={false}>Shopping</Link>
        <Link href={`/share/${bundle.room.id}`} prefetch={false}>Share</Link>
      </nav>
      <section className="card action-panel">
        <div>
          <h2>Generate deterministic plans</h2>
          <p className="muted">The engine filters unsafe dishes, scores the safe catalog, and returns the top menu combinations.</p>
        </div>
        {isHost && canGenerate ? (
          <MutationForm action={generatePlansAction.bind(null, bundle.room.id)}>
            <SubmitButton className="button" pendingLabel="Generating safe plans...">
              <Sparkles size={16} />
              Generate plans
            </SubmitButton>
          </MutationForm>
        ) : null}
      </section>
      {isHost && bundle.room.status === "VOTING" ? (
        <details className="card destructive-control">
          <summary>Reopen guest preferences</summary>
          <p className="muted">This permanently removes every generated plan and all votes in this room.</p>
          <MutationForm action={reopenPreferencesAction.bind(null, bundle.room.id)}>
            <label className="checkbox-label standalone">
              <input name="confirmDataLoss" type="checkbox" required />
              I understand that all current plans and votes will be deleted.
            </label>
            <SubmitButton className="button danger" pendingLabel="Reopening preferences...">
              Reopen and delete derived work
            </SubmitButton>
          </MutationForm>
        </details>
      ) : null}
      {isHost && bundle.room.status === "FINALIZED" ? (
        <details className="card destructive-control">
          <summary>Undo finalization</summary>
          <p className="muted">
            This returns the room to voting and deletes the shopping list, assignments, and purchase checks. Plans and votes stay.
          </p>
          <MutationForm action={undoFinalizationAction.bind(null, bundle.room.id)}>
            <label className="checkbox-label standalone">
              <input name="confirmDataLoss" type="checkbox" required />
              I understand that all shopping progress will be deleted.
            </label>
            <SubmitButton className="button danger" pendingLabel="Undoing finalization...">
              Undo and delete shopping progress
            </SubmitButton>
          </MutationForm>
        </details>
      ) : null}
      {bundle.room.generationReport ? <NoSolutionPanel report={bundle.room.generationReport} /> : null}
      {bundle.plans.length > 0 ? (
        <section className="grid three" aria-label="Generated menu plans">
          {bundle.plans.map((plan) => (
            <MenuPlanCard
              key={plan.id}
              plan={plan}
              canFinalize={isHost && bundle.room.status === "VOTING"}
              canVote={canVote}
            />
          ))}
        </section>
      ) : bundle.room.generationReport ? null : (
        <article className="card empty-state">
          <h2>No menu plans yet</h2>
          <p className="muted">Generate plans after guests have submitted their food preferences.</p>
        </article>
      )}
    </div>
  );
}

