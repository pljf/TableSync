import { Vote } from "lucide-react";
import Link from "next/link";
import type { DinnerRoom } from "@/lib/domain";
import { canPerformWorkflowAction } from "@/lib/workflow/state-machine";

type NextLink = { label: string; href: string };

type RoomNextStepProps = {
  room: DinnerRoom;
  guestCount: number;
  planCount: number;
  isHost: boolean;
  isRoomGuest: boolean;
  finalPlanTitle?: string;
  shoppingCount: number;
  contributions?: { claimedDishes: number; totalDishes: number };
};

export function RoomNextStep({ room, guestCount, planCount, isHost, isRoomGuest, finalPlanTitle, shoppingCount, contributions }: RoomNextStepProps) {
  const plansPath = `/rooms/${room.id}/plans`;
  const invitePath = isHost && room.inviteToken ? `/join/${room.inviteToken}` : undefined;
  const responses = room.expectedGuests
    ? `${guestCount} of ${Math.max(room.expectedGuests, guestCount)} guests have responded.`
    : `${guestCount} ${guestCount === 1 ? "guest has" : "guests have"} responded.`;
  let heading: string;
  let description: string;
  let primary: NextLink | undefined;
  let secondary: NextLink | undefined;

  if (room.status === "FINALIZED") {
    const allContributed = contributions && contributions.totalDishes > 0 && contributions.claimedDishes === contributions.totalDishes;
    heading = "Your menu is set";
    description = allContributed
      ? `${finalPlanTitle ?? "The menu"} is finalized. Every dish has a contributor, so no shared groceries are needed. Check who is bringing each dish and track readiness.`
      : contributions
        ? `${finalPlanTitle ?? "The menu"} is finalized. ${contributions.claimedDishes} of ${contributions.totalDishes} dishes have contributors, with ${shoppingCount} shared shopping items.`
        : `${finalPlanTitle ?? "The menu"} is finalized. Your ${shoppingCount}-item shopping list is ready to assign and check off.`;
    primary = allContributed
      ? { label: isHost ? "Manage dish contributions" : "View dish contributions", href: `${plansPath}#potluck-contributions` }
      : { label: "Open shopping", href: `/rooms/${room.id}/shopping` };
    if (!allContributed) secondary = { label: "View finalized menu", href: plansPath };
  } else if (room.status === "VOTING") {
    heading = isHost ? "Choose your shared menu" : "Have your say on the menu";
    description = `${planCount} menu ${planCount === 1 ? "plan is" : "plans are"} open for voting. ${isHost
      ? "Review the votes, then finalize one menu to create your shared shopping list."
      : "Vote on the options. The host will finalize a menu to create the shared shopping list."}`;
    primary = { label: isHost ? "Choose a menu" : isRoomGuest ? "Vote on menus" : "View menus", href: plansPath };
  } else if (canPerformWorkflowAction(room.status, "GENERATE_PLANS")) {
    if (room.generationReport) {
      heading = "A few changes before your menu is ready";
      description = isHost
        ? "The last attempt could not find a safe menu within the current constraints. Review the report, adjust the room or guest preferences, then try again."
        : "The host could not find a menu that fits the current constraints. Check your saved preferences while the host reviews the report.";
      primary = isHost || !isRoomGuest
        ? { label: "Review generation report", href: `${plansPath}#generation-report` }
        : { label: "Edit my preferences", href: `/preferences?roomId=${encodeURIComponent(room.id)}` };
    } else if (isHost && guestCount === 0) {
      heading = "Start with your food preferences";
      description = `${responses} Add your preferences or invite a guest to respond. Once a response is saved, you can generate menus for the group.`;
      if (invitePath) {
        primary = { label: "Add my preferences", href: invitePath };
        secondary = { label: "Invite guests", href: "#room-invite" };
      }
    } else if (isHost) {
      heading = "Ready to find your menu";
      description = `${responses} Open menu planning to generate options when your group is ready. Guests can still add preferences until you generate plans.`;
      primary = { label: "Open menu planning", href: plansPath };
      secondary = !isRoomGuest && invitePath
        ? { label: "Add my preferences", href: invitePath }
        : invitePath ? { label: "Invite guests", href: "#room-invite" } : undefined;
    } else {
      heading = "Your preferences are in";
      description = `${responses} The host will generate menus when the group is ready. You can update your preferences until then.`;
      if (isRoomGuest) primary = { label: "Edit my preferences", href: `/preferences?roomId=${encodeURIComponent(room.id)}` };
    }
  } else {
    heading = room.status === "ARCHIVED" ? "This room is archived" : "This room is not open yet";
    description = room.status === "ARCHIVED"
      ? "Planning changes are closed. You can still review the room’s saved information."
      : "Guest preferences, menus, and shopping will be available when the room opens.";
  }

  return (
    <section className="card decision-card" aria-label="Next step">
      <div className="decision-symbol" aria-hidden="true"><Vote size={24} /></div>
      <div className="decision-copy">
        <h2>{heading}</h2>
        <p className="muted">{description}</p>
      </div>
      {primary ? <div className="button-row">
        <Link className="button" href={primary.href} prefetch={false}>{primary.label}</Link>
        {secondary ? <Link className="button secondary" href={secondary.href} prefetch={false}>{secondary.label}</Link> : null}
      </div> : null}
    </section>
  );
}
