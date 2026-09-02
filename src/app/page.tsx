import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Link2, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";
import { MenuPlanCard } from "@/components/menu/menu-plan-card";
import { ConstraintSummary } from "@/components/rooms/constraint-summary";
import { RoomCard } from "@/components/rooms/room-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { demoRoom } from "@/lib/seed-data";
import { formatMoney } from "@/lib/format";
import { getRoomBundle } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const bundle = await getRoomBundle(demoRoom.id, {}, { allowPublicDemo: true });
  if (!bundle) {
    return null;
  }

  const finalPlan = bundle.plans.find((plan) => plan.status === "FINALIZED") ?? bundle.plans[0];
  const purchasedCount = bundle.shopping.filter((item) => item.checked).length;

  return (
    <div className="page-stack">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Collaborative dinner planning</p>
          <h1>TableSync turns group food chaos into a menu, votes, and a shopping plan.</h1>
          <p>
            Hosts create a room, guests submit structured constraints, the engine ranks safe menu plans, and the final
            pick becomes an assigned grocery list.
          </p>
          <div className="button-row">
            <Link className="button" href="/demo" prefetch={false}>
              Open demo
              <ArrowRight size={16} />
            </Link>
            <Link className="button secondary" href="/auth" prefetch={false}>
              Sign in as host
            </Link>
          </div>
        </div>
        <div className="product-preview">
          <div className="preview-toolbar">
            <span>Friday Hotpot Night</span>
            <StatusBadge status={bundle.room.status} />
          </div>
          <div className="preview-metrics">
            <span>
              <Users size={16} />
              {bundle.guests.length} guests
            </span>
            <span>
              <ClipboardList size={16} />
              {bundle.plans.length} plans
            </span>
            <span>
              <ShoppingCart size={16} />
              {purchasedCount}/{bundle.shopping.length} bought
            </span>
          </div>
          <div className="preview-plan">
            <h2>{finalPlan?.title}</h2>
            <strong>{formatMoney(finalPlan?.estimatedCostCents)}</strong>
            <ul>
              {finalPlan?.dishes.slice(0, 4).map(({ dish }) => (
                <li key={dish.id}>
                  <CheckCircle2 size={15} />
                  {dish.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid three">
        <article className="card">
          <Link2 size={20} />
          <h2>Invite guests</h2>
          <p className="muted">Guests join without accounts and submit diet, allergy, spice, budget, and shopping availability.</p>
        </article>
        <article className="card">
          <CalendarDays size={20} />
          <h2>Vote on menus</h2>
          <p className="muted">Plans are filtered by hard constraints, scored by preferences, and reviewed with likes or vetoes.</p>
        </article>
        <article className="card">
          <ShoppingCart size={20} />
          <h2>Shop together</h2>
          <p className="muted">The finalized menu becomes grouped groceries with estimated cost and balanced assignments.</p>
        </article>
      </section>

      <RoomCard room={bundle.room} guestCount={bundle.guests.length} shoppingCount={bundle.shopping.length} />
      <ConstraintSummary guests={bundle.guests} />
      {finalPlan ? <MenuPlanCard plan={finalPlan} /> : null}
    </div>
  );
}

