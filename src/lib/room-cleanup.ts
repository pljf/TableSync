import { prisma } from "@/lib/prisma";
import { expiredRoomCutoff } from "@/lib/room-retention";

/** Delete expired rooms and their related data through the database cascades. */
export async function purgeExpiredRooms(now = new Date()): Promise<{ count: number }> {
  return prisma.dinnerRoom.deleteMany({
    where: { createdAt: { lte: expiredRoomCutoff(now) } }
  });
}
