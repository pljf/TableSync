import { Plus } from "lucide-react";
import Link from "next/link";
import { RoomCard } from "@/components/rooms/room-card";
import { requireHostActor } from "@/lib/request-actors";
import { getRoomBundle, listRoomsForHost } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const host = await requireHostActor();
  const rooms = await listRoomsForHost(host);
  const roomBundles = await Promise.all(rooms.map((room) => getRoomBundle(room.id, { host })));

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Host dashboard</p>
          <h1>Your dinner rooms</h1>
        </div>
        <Link className="button" href="/rooms/new" prefetch={false}>
          <Plus size={16} />
          New room
        </Link>
      </header>
      <section className="grid two">
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
      </section>
    </div>
  );
}

