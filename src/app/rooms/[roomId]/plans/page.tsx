import { Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { generatePlansAction } from "@/app/actions";
import { MenuPlanCard } from "@/components/menu/menu-plan-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getRoomBundle } from "@/lib/store";

type PageProps = {
  params: Promise<{ roomId: string }> | { roomId: string };
};

export default async function RoomPlansPage({ params }: PageProps) {
  const { roomId } = await params;
  const bundle = getRoomBundle(roomId);
  if (!bundle) {
    notFound();
  }
  const user = await getCurrentUser();
  const canFinalize = user?.id === bundle.room.hostId;

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
        <Link href={`/rooms/${bundle.room.id}`}>Overview</Link>
        <Link href={`/rooms/${bundle.room.id}/plans`}>Plans</Link>
        <Link href={`/rooms/${bundle.room.id}/shopping`}>Shopping</Link>
        <Link href={`/share/${bundle.room.id}`}>Share</Link>
      </nav>
      <section className="card action-panel">
        <div>
          <h2>Generate deterministic plans</h2>
          <p className="muted">The engine filters unsafe dishes, scores the safe catalog, and returns the top menu combinations.</p>
        </div>
        {canFinalize ? (
          <form action={generatePlansAction.bind(null, bundle.room.id)}>
            <button className="button" type="submit">
              <Sparkles size={16} />
              Generate plans
            </button>
          </form>
        ) : null}
      </section>
      <section className="grid three">
        {bundle.plans.map((plan) => (
          <MenuPlanCard key={plan.id} plan={plan} guests={bundle.guests} canFinalize={canFinalize} />
        ))}
      </section>
    </div>
  );
}

