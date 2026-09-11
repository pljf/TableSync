import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { RequestActors } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { activeRoomWhere } from "@/lib/room-retention";

// Read only revision metadata. No guest preferences, vote reasons, recipes or
// shopping contents are loaded by the polling endpoint.
const revisionSelect = {
  id: true,
  updatedAt: true,
  guests: {
    orderBy: { id: "asc" },
    select: { id: true, updatedAt: true, preference: { select: { id: true, updatedAt: true } } }
  },
  plans: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      updatedAt: true,
      votes: { orderBy: { id: "asc" }, select: { id: true, updatedAt: true } },
      // Contribution rows have no updatedAt; include their mutable state.
      dishes: {
        orderBy: { id: "asc" },
        select: { id: true, servings: true, contributionGuestId: true, contributionReady: true }
      }
    }
  },
  shopping: { orderBy: { id: "asc" }, select: { id: true, updatedAt: true } },
  activities: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { id: true } },
  _count: { select: { activities: true } }
} satisfies Prisma.DinnerRoomSelect;

export async function getRoomRevision(roomId: string, actors: RequestActors): Promise<string | null> {
  const access: Prisma.DinnerRoomWhereInput[] = [];
  if (actors.host) access.push({ hostId: actors.host.userId });
  if (actors.guest?.roomId === roomId) access.push({ guests: { some: { id: actors.guest.guestId } } });
  if (!access.length) return null;

  const metadata = await prisma.dinnerRoom.findFirst({
    where: { id: roomId, OR: access, ...activeRoomWhere() },
    select: revisionSelect
  });
  return metadata ? createHash("sha256").update(JSON.stringify(metadata)).digest("hex") : null;
}
