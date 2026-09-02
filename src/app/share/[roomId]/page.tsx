import { CalendarDays, MapPin, ShoppingCart, Utensils } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, humanize } from "@/lib/format";
import { getPublicRoom } from "@/lib/store";

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
          <p className="eyebrow">Public dinner plan</p>
          <h1>{view.room.title}</h1>
        </div>
        <Badge tone="success">Finalized</Badge>
      </header>
      <section className="metric-grid">
        <article className="metric-card">
          <CalendarDays size={20} />
          <span>Date</span>
          <strong>{formatDate(view.room.dateTime)}</strong>
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
      {finalPlan ? (
        <section className="grid two">
          <article className="card">
            <div className="section-title">
              <Utensils size={18} />
              <h2>Final menu</h2>
            </div>
            <ul className="dish-list">
              {finalPlan.dishes.map((dish) => (
                <li key={dish.id}>
                  <span>{dish.name}</span>
                  <small>
                    {humanize(dish.category)} - {dish.servings} servings
                  </small>
                </li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h2>Shopping summary</h2>
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
