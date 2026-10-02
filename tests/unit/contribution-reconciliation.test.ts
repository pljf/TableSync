import { describe, expect, it } from "vitest";
import type { MenuPlanDish } from "@/lib/domain";
import { reconcileContributions } from "@/lib/menu-engine/reconcile-contributions";
import { dishCatalog as dishes } from "@/lib/seed-data";

const previous: MenuPlanDish = { id: "original", dish: dishes[0], servings: 4, contributionGuestId: "guest-1", contributionReady: true };

describe("contributions when choosing a revised menu", () => {
  it.each([4, 2])("keeps the contributor and readiness for the same recipe at %s servings", (servings) => {
    expect(reconcileContributions([previous], [{ ...previous, id: "replacement", servings }])).toEqual([
      { id: "replacement", contributionGuestId: "guest-1", contributionReady: true }
    ]);
  });
  it("requires another readiness check for larger portions", () => {
    expect(reconcileContributions([previous], [{ ...previous, id: "larger", servings: 6 }])).toEqual([
      { id: "larger", contributionGuestId: "guest-1", contributionReady: false }
    ]);
  });
  it("clears ownership for a different recipe and does not duplicate a commitment", () => {
    expect(reconcileContributions([previous], [
      { ...previous, id: "other", dish: dishes[1] }, { ...previous, id: "retained" }, { ...previous, id: "duplicate" }
    ])).toEqual([
      { id: "other", contributionGuestId: undefined, contributionReady: false },
      { id: "retained", contributionGuestId: "guest-1", contributionReady: true },
      { id: "duplicate", contributionGuestId: undefined, contributionReady: false }
    ]);
  });
});
