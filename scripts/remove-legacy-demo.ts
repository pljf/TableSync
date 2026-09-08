import { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

// Keep the retired record's identity fixed even if test fixtures change later.
const legacyDemo = {
  id: "room-friday-hotpot",
  hostId: "user-demo-host",
  title: "Friday Hotpot Night",
  inviteToken: "friday-hotpot"
} as const;

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply")) {
    throw new Error("Usage: tsx scripts/remove-legacy-demo.ts [--apply]");
  }
  const apply = args.includes("--apply");

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "DinnerRoom" WHERE "id" = ${legacyDemo.id} FOR UPDATE`);
    const room = await tx.dinnerRoom.findUnique({
      where: { id: legacyDemo.id },
      include: {
        host: { select: { id: true, name: true, email: true } },
        _count: { select: { guests: true, plans: true, shopping: true, activities: true } }
      }
    });
    if (!room) {
      console.log("The retired demo room is already absent. No records changed.");
      return;
    }
    if (
      room.hostId !== legacyDemo.hostId ||
      room.title !== legacyDemo.title ||
      room.inviteToken !== legacyDemo.inviteToken ||
      room.host.id !== legacyDemo.hostId ||
      room.host.name !== "Pat Host" ||
      room.host.email !== "pat@example.com"
    ) {
      throw new Error("The room no longer matches the retired demo identity. Refusing to remove it.");
    }

    console.log(JSON.stringify({ roomId: legacyDemo.id, relatedRecords: room._count, apply }, null, 2));
    if (!apply) {
      console.log("Dry run complete. Use --apply to remove only this demo room and its dependent records.");
      return;
    }

    const removed = await tx.dinnerRoom.deleteMany({ where: legacyDemo });
    if (removed.count !== 1) throw new Error("The demo room changed before removal. No records removed.");
    console.log("Removed the retired demo room and its dependent records. The host account and catalog remain.");
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
