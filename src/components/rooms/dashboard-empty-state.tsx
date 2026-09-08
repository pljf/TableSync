import Link from "next/link";
import { Plus, Utensils } from "lucide-react";

export function DashboardEmptyState() {
  return (
    <article className="card empty-state dashboard-empty">
      <div className="dashboard-empty-art" aria-hidden="true">
        <span className="empty-table"><Utensils size={34} /></span>
        <span className="empty-plate empty-plate-left" />
        <span className="empty-plate empty-plate-right" />
      </div>
      <div className="dashboard-empty-copy">
        <p className="eyebrow">There’s a place for everyone</p>
        <h2>No meal rooms yet</h2>
        <p className="muted">Create your first room to collect guest preferences and build a shared menu. A simple invite link brings everyone to the table.</p>
        <Link className="button" href="/rooms/new" prefetch={false}>
          <Plus aria-hidden="true" size={16} />
          Create your first room
        </Link>
      </div>
      <ol className="dashboard-empty-steps" aria-label="How to get started">
        <li><span aria-hidden="true">01</span>Create a room</li>
        <li><span aria-hidden="true">02</span>Share the invite link</li>
        <li><span aria-hidden="true">03</span>Plan your menu together</li>
      </ol>
    </article>
  );
}
