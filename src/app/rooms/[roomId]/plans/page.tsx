import { Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { generatePlansAction, reopenPreferencesAction, undoFinalizationAction } from "@/app/actions";
import { MenuPlanReview } from "@/components/menu/menu-plan-review";
import { NoSolutionPanel } from "@/components/menu/no-solution-panel";
import { RoomNavigation } from "@/components/rooms/room-navigation";
import { RoomProgress } from "@/components/rooms/room-progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { getRequestActors } from "@/lib/request-actors";
import { getRoomRevision } from "@/lib/room-revision";
import { getRoomBundle } from "@/lib/store";
import { SubmitButton } from "@/components/ui/submit-button";
import { MutationForm } from "@/components/ui/mutation-form";
import { DietaryNote } from "@/components/menu/dietary-note";
import { PotluckContributions } from "@/components/menu/potluck-contributions";
import { EventPreparationNotes } from "@/components/menu/event-preparation-notes";
import { eventFormats } from "@/lib/event-formats";
import { eventTypeLabels } from "@/lib/format";
import "@/app/menu-review.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ roomId: string }> | { roomId: string };
};

export default async function RoomPlansPage({ params }: PageProps) {
  const { roomId } = await params;
  const actors = await getRequestActors(roomId);
  const initialRevision = await getRoomRevision(roomId, actors);
  const bundle = await getRoomBundle(roomId, actors);
  if (!bundle) {
    notFound();
  }
  const isHost = actors.host?.userId === bundle.room.hostId;
  const isGuest = actors.guest?.roomId === bundle.room.id;
  const isPotluck = bundle.room.eventType === "POTLUCK";
  const finalPlan = bundle.plans.find((plan) => plan.status === "FINALIZED");
  const canGenerate = ["COLLECTING_PREFERENCES", "PLANNING"].includes(bundle.room.status);
  const canVote = bundle.room.status === "VOTING" && isGuest;
  const needsReportReview = canGenerate && Boolean(bundle.room.generationReport);
  const invitePath = bundle.room.inviteToken ? `/join/${bundle.room.inviteToken}` : undefined;
  const plannedGuestCount = Math.max(bundle.room.expectedGuests ?? bundle.guests.length, bundle.guests.length, 1);
  const shareAvailable =
    bundle.room.isPublicShareable &&
    bundle.room.status === "FINALIZED" &&
    bundle.plans.some((plan) => plan.status === "FINALIZED");
  const actionPanel = canGenerate
    ? {
        heading: needsReportReview
          ? "Review what needs to change"
          : isHost
            ? bundle.guests.length > 0 ? "Ready to find your menu" : "Start with meal preferences"
            : "Waiting for the host",
        description: needsReportReview
          ? isHost
            ? "No safe menu fits the current settings. Review the report below, then adjust the budget or relevant preferences before generating again."
            : isGuest
              ? "No safe menu fits the current settings. Review the report below and check your saved preferences. The host can update the budget and try again."
              : "No safe menu fits the current settings. The host can review the report below, update the budget or ask guests to check their preferences, and try again."
          : isHost
            ? bundle.guests.length > 0
              ? `${bundle.guests.length} ${bundle.guests.length === 1 ? "response is" : "responses are"} ready. Generate plans when your group is ready to compare menus and vote.`
              : "Add your meal preferences first, or invite guests to share theirs. Once a response is saved, you can generate menus for the group."
            : isGuest
              ? "Your preferences are saved. You can edit them until the host generates menus and opens voting."
              : "The host can generate menus after guests submit their preferences. Open your invitation to add your own response."
      }
    : bundle.room.status === "VOTING"
      ? {
          heading: "Voting is open",
          description: isHost
            ? "Compare the menus and guest votes below, then finalize one menu to create the shopping list automatically."
            : canVote
              ? "Review each complete menu and save a Like, Neutral, or reasoned Veto. The host will finalize a menu to open shopping."
              : "Guests who joined this room can vote. The host will finalize a menu to open shopping."
        }
      : bundle.room.status === "FINALIZED" ? {
          heading: "Menu finalized",
          description: isPotluck ? "The menu is set. Claim whole dishes below, then use shared shopping for the remaining ingredients." : "Your shopping list is ready. Open shopping to assign groceries and track purchases."
        } : bundle.room.status === "ARCHIVED" ? {
          heading: "This room is archived",
          description: "You can review any saved menus below. Preferences, voting, and shopping updates are closed."
        } : {
          heading: "This room is a draft",
          description: "Menu planning starts when the room opens for guest preferences."
        };

  return (
    <div className="page-stack plans-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{eventTypeLabels[bundle.room.eventType]} menu plans</p>
          <h1>{bundle.room.title}</h1>
        </div>
        <StatusBadge status={bundle.room.status} />
      </header>
      <RoomProgress status={bundle.room.status} guestCount={bundle.guests.length} expectedGuests={bundle.room.expectedGuests} />
      <RoomNavigation active="plans" guestCanViewPreferences={isGuest} initialRevision={initialRevision ?? undefined} roomId={bundle.room.id} shareAvailable={shareAvailable} />
      <section className="card action-panel planning-action">
        <div>
          <h2>{actionPanel.heading}</h2>
          <p className="muted">{actionPanel.description}</p>
          <p className="muted">{eventFormats[bundle.room.eventType].structure}</p>
          <EventPreparationNotes eventType={bundle.room.eventType} />
        </div>
        <div className="button-row">
          {isHost && needsReportReview ? (
            <Link className="button" href="#generation-report" prefetch={false}>Review generation report</Link>
          ) : null}
          {isHost && canGenerate && bundle.guests.length > 0 ? (
            <MutationForm action={generatePlansAction.bind(null, bundle.room.id)}>
              <SubmitButton className={needsReportReview ? "button secondary" : "button"} pendingLabel="Finding menus...">
                <Sparkles size={16} />
                Generate plans
              </SubmitButton>
            </MutationForm>
          ) : isHost && canGenerate && invitePath && !isGuest ? (
            <Link className={needsReportReview ? "button secondary" : "button"} href={invitePath} prefetch={false}>Add my preferences</Link>
          ) : null}
          {isGuest && canGenerate ? (
            <Link className={isHost ? "button secondary" : "button"} href={`/preferences?roomId=${encodeURIComponent(roomId)}`} prefetch={false}>Edit my preferences</Link>
          ) : null}
          {isHost && canGenerate && bundle.guests.length === 0 && invitePath ? (
            <Link className="button secondary" href={`/rooms/${bundle.room.id}#room-invite`} prefetch={false}>Invite guests</Link>
          ) : null}
          {bundle.room.status === "FINALIZED" && finalPlan ? (
            <>
              {isPotluck ? <Link className="button" href="#potluck-contributions" prefetch={false}>{isHost ? "Manage contributions" : "View contributions"}</Link> : null}
              <Link className={isPotluck ? "button secondary" : "button"} href={`/rooms/${bundle.room.id}/shopping`} prefetch={false}>Open shopping</Link>
            </>
          ) : null}
          {["DRAFT", "ARCHIVED"].includes(bundle.room.status) ? (
            <Link className="button secondary" href={`/rooms/${bundle.room.id}`} prefetch={false}>View room overview</Link>
          ) : null}
        </div>
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
            This returns the room to voting and deletes the shopping list, assignments, and purchase checks.{isPotluck ? " All contribution ownership and readiness will also be cleared." : ""} Plans and votes stay.
          </p>
          <MutationForm action={undoFinalizationAction.bind(null, bundle.room.id)}>
            <label className="checkbox-label standalone">
              <input name="confirmDataLoss" type="checkbox" required />
              I understand that all shopping progress{isPotluck ? " and contributions" : ""} will be deleted.
            </label>
            <SubmitButton className="button danger" pendingLabel="Undoing finalization...">
              Undo and delete shopping progress
            </SubmitButton>
          </MutationForm>
        </details>
      ) : null}
      {bundle.room.generationReport ? <div id="generation-report"><NoSolutionPanel report={bundle.room.generationReport} editRoomHref={isHost && canGenerate ? `/rooms/${bundle.room.id}/edit` : undefined} /></div> : null}
      <DietaryNote />
      {bundle.plans.length > 0 ? (
        <MenuPlanReview
          plans={bundle.plans}
          eventType={bundle.room.eventType}
          guests={bundle.guests}
          plannedGuestCount={plannedGuestCount}
          canFinalize={isHost && bundle.room.status === "VOTING"}
          canVote={canVote}
          currentGuestId={actors.guest?.roomId === bundle.room.id ? actors.guest.guestId : undefined}
          votingOpen={bundle.room.status === "VOTING"}
        />
      ) : bundle.room.generationReport ? null : (
        <article className="card empty-state">
          <h2>No menu plans yet</h2>
          <p className="muted">{canGenerate ? "Menus will appear here after the host generates plans from the group’s preferences." : "Any menus saved for this room will appear here."}</p>
        </article>
      )}
      {isPotluck && bundle.room.status === "FINALIZED" && finalPlan ? <div id="potluck-contributions"><PotluckContributions plan={finalPlan} guests={bundle.guests} guestId={actors.guest?.roomId === bundle.room.id ? actors.guest.guestId : undefined} isHost={isHost} hasShopping={bundle.shopping.length > 0} /></div> : null}
    </div>
  );
}

