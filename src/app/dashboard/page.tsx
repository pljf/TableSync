import { CalendarDays, CheckCheck, Plus, Users } from "lucide-react";
import Link from "next/link";
import { RoomCard } from "@/components/rooms/room-card";
import { DashboardEmptyState } from "@/components/rooms/dashboard-empty-state";
import { hostActorFromUser } from "@/lib/authorization";
import { getRoomBundle, listRoomsForHost } from "@/lib/store";
import { requireHost } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ saved?: string }> | { saved?: string } } = {}) {
  const user = await requireHost();
  const query = searchParams ? await searchParams : {};
  const host = hostActorFromUser(user);
  const rooms = await listRoomsForHost(host);
  const roomBundles = await Promise.all(rooms.map((room) => getRoomBundle(room.id, { host })));
  const collectingCount = rooms.filter((room) => ["COLLECTING_PREFERENCES", "PLANNING"].includes(room.status)).length;
  const finalizedCount = rooms.filter((room) => room.status === "FINALIZED").length;

  return (
    <div className="page-stack dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Host dashboard</p>
          <h1>Your meal rooms</h1>
          <p className="muted dashboard-intro">Bring your people together. We’ll help with the menu.</p>
        </div>
        <Link className="button" href="/rooms/new" prefetch={false}>
          <Plus aria-hidden="true" size={16} />
          New room
        </Link>
      </header>
      {query.saved === "1" && !user.isAnonymous ? <p className="feedback success-feedback" role="status">Your hosted rooms are saved to your account. Use the same GitHub account to return from another device.</p> : null}
      {user.isAnonymous ? (
        <aside className="card guest-access-note" aria-label="Guest account">
          <strong>You’re using a guest account</strong>
          <p className="muted">You can use every planning feature. Your rooms stay available in this browser for up to 7 days. Ending your session or clearing cookies removes your access.</p>
          <Link className="button secondary" href="/auth?upgrade=1" prefetch={false}>Save my rooms</Link>
        </aside>
      ) : null}
      {rooms.length > 0 ? (
        <>
          <section className="dashboard-stats" aria-label="Room summary">
            <article className="dashboard-stat">
              <span className="dashboard-stat-icon"><CalendarDays aria-hidden="true" size={20} /></span>
              <div><strong>{rooms.length}</strong><span>{rooms.length === 1 ? "Meal room" : "Meal rooms"}</span></div>
            </article>
            <article className="dashboard-stat">
              <span className="dashboard-stat-icon"><Users aria-hidden="true" size={20} /></span>
              <div><strong>{collectingCount}</strong><span>Gathering preferences</span></div>
            </article>
            <article className="dashboard-stat">
              <span className="dashboard-stat-icon"><CheckCheck aria-hidden="true" size={20} /></span>
              <div><strong>{finalizedCount}</strong><span>{finalizedCount === 1 ? "Menu finalized" : "Menus finalized"}</span></div>
            </article>
          </section>
          <section aria-labelledby="dashboard-rooms-heading">
            <div className="dashboard-section-heading">
              <h2 id="dashboard-rooms-heading">All gatherings</h2>
              <span className="muted">Most recently updated first</span>
            </div>
            <div className="grid two dashboard-room-grid">
              {rooms.map((room, index) => {
                const bundle = roomBundles[index];
                return (
                  <RoomCard
                    key={room.id}
                    room={room}
                    guestCount={bundle?.guests.length ?? 0}
                    shoppingCount={bundle?.shopping.length ?? 0}
                  />
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <DashboardEmptyState />
      )}
    </div>
  );
}

