import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingList } from "@/components/shopping/shopping-list";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { getRoomBundle } from "@/lib/store";

type PageProps = {
  params: Promise<{ roomId: string }> | { roomId: string };
};

export default async function ShoppingPage({ params }: PageProps) {
  const { roomId } = await params;
  const bundle = await getRoomBundle(roomId);
  if (!bundle) {
    notFound();
  }

  const total = bundle.shopping.reduce((sum, item) => sum + (item.estimatedCostCents ?? 0), 0);
  const purchased = bundle.shopping.filter((item) => item.checked).length;
  const unassigned = bundle.shopping.filter((item) => !item.assignedToGuestId).length;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Shopping workflow</p>
          <h1>{bundle.room.title}</h1>
        </div>
        <Badge tone={unassigned === 0 ? "success" : "warning"}>{unassigned} unassigned</Badge>
      </header>
      <nav className="tab-nav" aria-label="Room sections">
        <Link href={`/rooms/${bundle.room.id}`}>Overview</Link>
        <Link href={`/rooms/${bundle.room.id}/plans`}>Plans</Link>
        <Link href={`/rooms/${bundle.room.id}/shopping`}>Shopping</Link>
        <Link href={`/share/${bundle.room.id}`}>Share</Link>
      </nav>
      <section className="metric-grid">
        <article className="metric-card">
          <ShoppingCart size={20} />
          <span>Total estimate</span>
          <strong>{formatMoney(total)}</strong>
        </article>
        <article className="metric-card">
          <ShoppingCart size={20} />
          <span>Cost per person</span>
          <strong>{formatMoney(Math.round(total / Math.max(bundle.guests.length, 1)))}</strong>
        </article>
        <article className="metric-card">
          <ShoppingCart size={20} />
          <span>Purchased</span>
          <strong>
            {purchased}/{bundle.shopping.length}
          </strong>
        </article>
      </section>
      {bundle.shopping.length > 0 ? (
        <ShoppingList items={bundle.shopping} guests={bundle.guests} />
      ) : (
        <article className="card empty-state">
          <h2>No shopping list yet</h2>
          <p className="muted">Finalize a menu plan to generate grouped groceries and assignments.</p>
          <Link className="button" href={`/rooms/${bundle.room.id}/plans`}>
            Open plans
          </Link>
        </article>
      )}
    </div>
  );
}

