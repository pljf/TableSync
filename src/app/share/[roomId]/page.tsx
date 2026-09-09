import { CalendarDays, MapPin, ShoppingCart, Utensils } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { eventTypeLabels, formatMoney, humanize } from "@/lib/format";
import { EventDateTime } from "@/components/ui/event-date-time";
import { compareMenuDishes, formatServings, menuDishRole } from "@/lib/menu-presentation";
import { eventFormats } from "@/lib/event-formats";
import { getPublicRoom } from "@/lib/store";
import { DietaryNote } from "@/components/menu/dietary-note";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ roomId: string }> | { roomId: string };
};

export default async function SharePage({ params }: PageProps) {
  const { roomId } = await params;
  const view = await getPublicRoom(roomId);
  if (!view) {
    notFound();
  }

  const finalPlan = view.finalPlan;

  return (
    <div className="page-stack public-share">
      <header className="page-header">
        <div>
          <p className="eyebrow">Public {eventTypeLabels[view.room.eventType].toLowerCase()} plan</p>
          <h1>{view.room.title}</h1>
          <p className="muted">{eventFormats[view.room.eventType].description}</p>
        </div>
        <Badge tone="success">Finalized</Badge>
      </header>
      <section className="metric-grid">
        <article className="metric-card">
          <CalendarDays size={20} />
          <span>Date</span>
          <strong><EventDateTime value={view.room.dateTime} /></strong>
        </article>
        <article className="metric-card">
          <MapPin size={20} />
          <span>Location</span>
          <strong>{view.room.location || "TBD"}</strong>
        </article>
        <article className="metric-card">
          <ShoppingCart size={20} />
          <span>Budget</span>
          <strong>{formatMoney(view.room.totalBudgetCents)}</strong>
        </article>
      </section>
      <DietaryNote />
      {finalPlan ? (
        <section className="grid two">
          <article className="card">
            <div className="section-title">
              <Utensils size={18} />
              <h2>Final menu</h2>
            </div>
            <ul className="dish-list">
              {[...finalPlan.dishes].sort((left, right) => compareMenuDishes(left, right, view.room.eventType)).map((dish) => (
                <li key={dish.id}>
                  <span>{dish.name}</span>
                  <small>
                    {menuDishRole(dish, view.room.eventType)} - {formatServings(dish.servings)}
                  </small>
                </li>
              ))}
            </ul>
            {finalPlan.preparationNotes.length > 0 ? (
              <div className="warning-list" aria-label="Menu preparation notes">
                <h3>Preparation notes</h3>
                {finalPlan.preparationNotes.map((note) => <p key={note}>{note}</p>)}
              </div>
            ) : null}
          </article>
          <article className="card">
            <h2>Shopping summary</h2>
            {finalPlan.contributionSummary ? <p>{finalPlan.contributionSummary.claimedDishes} of {finalPlan.contributionSummary.totalDishes} dishes have contributors; {finalPlan.contributionSummary.readyDishes} ready to bring. Shared shopping covers the remaining dishes.</p> : null}
            {view.shoppingCategories.length === 0 ? <p className="muted">No shared groceries are needed.</p> : null}
            <div className="tag-list">
              {view.shoppingCategories.map(({ category, count }) => (
                <Badge key={category} tone="info">
                  {humanize(category)}: {count}
                </Badge>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
