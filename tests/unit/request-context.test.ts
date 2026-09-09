import { beforeEach, describe, expect, it, vi } from "vitest";

const lookup = vi.hoisted(() => ({ plan: vi.fn(), shopping: vi.fn(), contribution: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { menuPlan: { findUnique: lookup.plan }, shoppingItem: { findUnique: lookup.shopping }, menuPlanDish: { findUnique: lookup.contribution } } }));
import { resourceRoomId } from "@/lib/request-context";

describe("server-derived mutation room", () => {
  beforeEach(() => vi.resetAllMocks());
  it("uses the stored plan, grocery, and contribution relation", async () => {
    lookup.plan.mockResolvedValue({ roomId: "room-a" });
    lookup.shopping.mockResolvedValue({ roomId: "room-b" });
    lookup.contribution.mockResolvedValue({ plan: { roomId: "room-c" } });
    expect(await resourceRoomId("plan", "plan-id")).toBe("room-a");
    expect(await resourceRoomId("shopping-item", "item-id")).toBe("room-b");
    expect(await resourceRoomId("menu-plan-dish", "dish-id")).toBe("room-c");
    expect(lookup.plan).toHaveBeenCalledWith({ where: { id: "plan-id" }, select: { roomId: true } });
    expect(lookup.contribution).toHaveBeenCalledWith({ where: { id: "dish-id" }, select: { plan: { select: { roomId: true } } } });
  });
  it.each(["plan", "shopping-item", "menu-plan-dish"] as const)("rejects a missing %s before selecting any identity", async (kind) => {
    await expect(resourceRoomId(kind, "missing")).rejects.toThrow("You do not have access");
  });
});
