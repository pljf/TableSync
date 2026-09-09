import { AuthorizationError } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

/** Resolve the target on the server before selecting a browser's room identity. */
export async function resourceRoomId(resource: "plan" | "shopping-item" | "menu-plan-dish", id: string): Promise<string> {
  const reference = resource === "plan"
    ? await prisma.menuPlan.findUnique({ where: { id }, select: { roomId: true } })
    : resource === "shopping-item"
      ? await prisma.shoppingItem.findUnique({ where: { id }, select: { roomId: true } })
      : await prisma.menuPlanDish.findUnique({ where: { id }, select: { plan: { select: { roomId: true } } } });
  if (!reference) throw new AuthorizationError();
  return "roomId" in reference ? reference.roomId : reference.plan.roomId;
}
