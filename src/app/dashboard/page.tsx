import { ArrowRight, CalendarDays, CheckCheck, Heart, Plus, Users } from "lucide-react";
import Link from "next/link";
import { RoomCard } from "@/components/rooms/room-card";
import { DashboardEmptyState } from "@/components/rooms/dashboard-empty-state";
import { RoomExpiryNotice } from "@/components/rooms/room-expiry-notice";
import { hostActorFromUser } from "@/lib/authorization";
import { getRoomBundle, listRoomsForHost } from "@/lib/store";
import { requireHost } from "@/lib/auth";
import { MotionScene } from "@/components/layout/motion-scene";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ saved?: string; deleted?: string }> }) {
  const user = await requireHost();
  const query = searchParams ? await searchParams : {};
  const host = hostActorFromUser(user);
  const rooms = await listRoomsForHost(host);
  const roomBundles = await Promise.all(rooms.map((room) => getRoomBundle(room.id, { host })));
  const collectingCount = rooms.filter((room) => ["COLLECTING_PREFERENCES", "PLANNING"].includes(room.status)).length;
  const finalizedCount = rooms.filter((room) => room.status === "FINALIZED").length;

  return (
    <MotionScene className="page-stack dashboard-page live-dashboard" sceneKey="dashboard">
      <header className="live-dashboard-heading">
        <div data-reveal>
          <p className="live-section-label">Your meal rooms</p>
          <h1 className="live-dashboard-title">Good things<br /><em>are on the way.</em></h1>
        </div>
        <div className="live-dashboard-intro" data-reveal data-delay="140">
          <p>Your favorite people. Something delicious. A reason to get together.</p>
          <Link className="button" href="/rooms/new" prefetch={false}>
            <Plus aria-hidden="true" size={18} />
            New room
          </Link>
        </div>
      </header>
      {query.deleted === "1" ? <p className="feedback success-feedback" role="status">Room deleted. Its guest preferences, menus, votes, and shopping progress have been removed.</p> : null}
      {query.saved === "1" && !user.isAnonymous ? <p className="feedback success-feedback" role="status">Your hosted rooms are linked to your account. Use the same GitHub account to return from another device until the rooms expire.</p> : null}
      {user.isAnonymous ? (
        <aside className="card guest-access-note" aria-label="Guest account">
          <strong>You’re using a guest account</strong>
          <p className="muted">You can use every planning feature. Your guest session lasts up to 7 days in this browser. Ending your session or clearing cookies removes your access.</p>
          <Link className="button secondary" href="/auth?upgrade=1" prefetch={false}>Save my rooms</Link>
        </aside>
      ) : null}
      {rooms.length > 0 ? (
        <>
          <section className="dashboard-stats" aria-label="Room summary" data-reveal>
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
            <div className={`live-gatherings${rooms.length === 1 ? " live-gatherings-single" : ""}`}>
              {rooms.map((room, index) => {
                const bundle = roomBundles[index];
                return (
                  <RoomCard
                    key={room.id}
                    room={room}
                    guestCount={bundle?.guests.length ?? 0}
                    shoppingCount={bundle?.shopping.length ?? 0}
                    featured={index === 0}
                    index={index}
                  />
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <DashboardEmptyState />
      )}
      <div className="live-dashboard-note" data-reveal>
        <Heart size={23} aria-hidden="true" />
        <p>The best part of any plan is the people in it.</p>
        <Link href="/rooms/new" prefetch={false}>Make another plan <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <RoomExpiryNotice />
    </MotionScene>
  );
}

