import { CheckCheck, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingList } from "@/components/shopping/shopping-list";
import { RoomNavigation } from "@/components/rooms/room-navigation";
import { RoomProgress } from "@/components/rooms/room-progress";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { getRequestActors } from "@/lib/request-actors";
import { getRoomRevision } from "@/lib/room-revision";
import { getRoomBundle } from "@/lib/store";
import { contributionSummary } from "@/lib/menu-presentation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ roomId: string }> | { roomId: string };
};

export default async function ShoppingPage({ params }: PageProps) {
  const { roomId } = await params;
  const actors = await getRequestActors(roomId);
  const initialRevision = await getRoomRevision(roomId, actors);
  const bundle = await getRoomBundle(roomId, actors);
  if (!bundle) {
    notFound();
  }

  const total = bundle.shopping.reduce((sum, item) => sum + (item.estimatedCostCents ?? 0), 0);
  const isHost = actors.host?.userId === bundle.room.hostId;
  const isGuest = actors.guest?.roomId === bundle.room.id;
  const purchased = bundle.shopping.filter((item) => item.checked).length;
  const unassigned = bundle.shopping.filter((item) => !item.assignedToGuestId).length;
  const hasShopping = bundle.shopping.length > 0;
  const finalPlan = bundle.plans.find((plan) => plan.status === "FINALIZED");
  const contributions = bundle.room.eventType === "POTLUCK" && finalPlan ? contributionSummary(finalPlan.dishes) : undefined;
  const allContributed = bundle.room.status === "FINALIZED" && Boolean(contributions && contributions.totalDishes > 0 && contributions.claimedDishes === contributions.totalDishes);
  const plannedGuests = Math.max(bundle.room.expectedGuests ?? bundle.guests.length, bundle.guests.length, 1);
  const shareAvailable =
    bundle.room.isPublicShareable &&
    bundle.room.status === "FINALIZED" &&
    bundle.plans.some((plan) => plan.status === "FINALIZED");
  const roomHref = `/rooms/${bundle.room.id}`;
  const plansHref = `${roomHref}/plans`;
  const preferencesOpen = ["COLLECTING_PREFERENCES", "PLANNING"].includes(bundle.room.status);
  const emptyState = allContributed
    ? {
        description: "No shared groceries are needed. Contributors can check their ingredients and mark dishes ready on the plans page.",
        href: `${plansHref}#potluck-contributions`,
        label: isHost ? "Manage contributions" : "View contributions"
      }
    : bundle.room.status === "ARCHIVED"
      ? {
          description: "This room is archived and has no saved shopping list. Shopping updates are closed.",
          href: roomHref,
          label: "View room overview"
        }
      : bundle.room.status === "DRAFT"
        ? {
            description: "This room is a draft. Shopping becomes available after guest preferences are collected and the host finalizes a menu.",
            href: roomHref,
            label: "View room overview"
          }
        : preferencesOpen && bundle.room.generationReport
          ? {
              description: isHost
                ? "A menu needs attention before shopping can open. Review the generation report, adjust the budget or relevant preferences, then generate plans again."
                : isGuest
                  ? "A menu needs attention before shopping can open. Check your saved preferences while the host reviews the generation report and budget."
                  : "A menu needs attention before shopping can open. The host is able to review the generation report and update the room settings.",
              href: isGuest && !isHost ? `/preferences?roomId=${encodeURIComponent(roomId)}` : `${plansHref}#generation-report`,
              label: isGuest && !isHost ? "Edit my preferences" : "Review generation report"
            }
          : preferencesOpen && isHost && bundle.guests.length === 0 && bundle.room.inviteToken
            ? {
                description: "Start by adding your meal preferences or inviting guests. Then generate plans, collect votes, and finalize a menu.",
                href: isGuest ? `/preferences?roomId=${encodeURIComponent(roomId)}` : `/join/${bundle.room.inviteToken}`,
                label: isGuest ? "Edit my preferences" : "Add my preferences"
              }
            : preferencesOpen
              ? {
                  description: isHost
                    ? "Guest preferences are ready. Open plans and choose Generate plans, compare menus, then finalize your choice."
                    : isGuest
                      ? "Your preferences are saved. You can edit them while you wait for the host to generate menus and open voting."
                      : "The host is collecting guest preferences. Open your invitation to add a response, then return here once a menu is finalized.",
                  href: isHost ? plansHref : isGuest ? `/preferences?roomId=${encodeURIComponent(roomId)}` : roomHref,
                  label: isHost ? "Open plans" : isGuest ? "Edit my preferences" : "View room overview"
                }
              : bundle.room.status === "VOTING"
                ? {
                    description: isHost
                      ? "Menus are ready. Review the group’s votes and finalize one menu to open shopping."
                      : isGuest
                        ? "Menus are ready for your vote. Shopping will open when the host finalizes the group’s menu."
                        : "Menus are being reviewed. Shopping will open when the host finalizes the group’s menu.",
                    href: plansHref,
                    label: isHost ? "Choose a menu" : isGuest ? "Vote on menus" : "View menus"
                  }
                : {
                    description: "The menu is finalized, but no shared groceries are listed. Open plans to review the selected menu and any dish contributions.",
                    href: plansHref,
                    label: "Open plans"
                  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Shopping workflow</p>
          <h1>{bundle.room.title}</h1>
        </div>
        <Badge tone={allContributed ? "success" : !hasShopping ? "neutral" : unassigned === 0 ? "success" : "warning"}>
          {allContributed ? "All dishes contributed" : hasShopping ? `${unassigned} unassigned` : bundle.room.status === "ARCHIVED" ? "Archived" : bundle.room.status === "DRAFT" ? "Draft" : bundle.room.status === "FINALIZED" ? "No shared groceries" : "Waiting for a menu"}
        </Badge>
      </header>
      <RoomProgress status={bundle.room.status} guestCount={bundle.guests.length} expectedGuests={bundle.room.expectedGuests} />
      <RoomNavigation active="shopping" guestCanViewPreferences={isGuest} initialRevision={initialRevision ?? undefined} roomId={bundle.room.id} shareAvailable={shareAvailable} />
      {contributions && finalPlan ? (
        <section aria-label="Potluck food costs" className="card potluck-cost-summary">
          <div><h2>Shared groceries and contributed food</h2><p className="muted">Contributors handle all ingredients for their claimed dishes. Only unclaimed dishes appear in shared shopping. The food budget includes both.</p></div>
          <dl className="contribution-costs">
            <div><dt>Total food estimate</dt><dd>{formatMoney(finalPlan.estimatedCostCents)}</dd></div>
            <div><dt>Contributed food estimate</dt><dd>{formatMoney(contributions.contributedCostCents)}</dd></div>
            <div><dt>Shared grocery estimate</dt><dd>{formatMoney(total)}</dd></div>
          </dl>
          <Link className="button secondary" href={bundle.room.status === "FINALIZED" ? `${plansHref}#potluck-contributions` : plansHref} prefetch={false}>
            {bundle.room.status !== "FINALIZED" ? "View saved menus" : isHost ? "Manage dish contributions" : "View dish contributions"}
          </Link>
        </section>
      ) : null}
      {hasShopping ? (
        <>
          <section className="metric-grid shopping-metrics">
            <article className="metric-card">
              <ShoppingCart size={20} />
              <span>{contributions ? "Shared grocery estimate" : "Total estimate"}</span>
              <strong>{formatMoney(total)}</strong>
            </article>
            <article className="metric-card">
              <Users size={20} />
              <span>{contributions ? "Shared groceries per person" : "Cost per person"}</span>
              <strong>{formatMoney(Math.round(total / plannedGuests))}</strong>
              <small>Based on {plannedGuests} planned guests</small>
            </article>
            <article className="metric-card">
              <CheckCheck size={20} />
              <span>Purchased</span>
              <strong>
                {purchased}/{bundle.shopping.length}
              </strong>
              <progress aria-label="Items purchased" max={bundle.shopping.length} value={purchased} />
            </article>
          </section>
          <ShoppingList
            guests={bundle.guests.map(({ id, name }) => ({ id, name }))}
            guestId={actors.guest?.roomId === bundle.room.id ? actors.guest.guestId : undefined}
            hostCanManage={isHost}
            items={bundle.shopping}
          />
        </>
      ) : (
        <article className="card empty-state">
          <h2>{allContributed ? "Every dish has a contributor" : "No shopping list yet"}</h2>
          {!allContributed && (preferencesOpen || bundle.room.status === "VOTING") ? <p className="muted">Your shopping list appears automatically after the host finalizes a menu.</p> : null}
          <p className="muted">{emptyState.description}</p>
          <div className="button-row">
            <Link className="button" href={emptyState.href} prefetch={false}>{emptyState.label}</Link>
            {isHost && preferencesOpen && bundle.guests.length === 0 && bundle.room.inviteToken ? (
              <Link className="button secondary" href={`${roomHref}#room-invite`} prefetch={false}>Invite guests</Link>
            ) : null}
          </div>
        </article>
      )}
    </div>
  );
}

