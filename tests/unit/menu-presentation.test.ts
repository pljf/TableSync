import { describe, expect, it } from "vitest";
import type { DishCategory, EventType, HotpotRole, MenuPlanDish } from "@/lib/domain";
import { compareMenuDishes, contributionCostCents, contributionSummary, formatServings, menuDishRole } from "@/lib/menu-presentation";

function dish(name: string, category: DishCategory, hotpotRole?: HotpotRole) {
  return { category, hotpotRole, name };
}

describe("menu presentation", () => {
  it("orders Hotpot dishes by meal structure", () => {
    const dishes = [
      dish("Tea", "DRINK", "DRINK"),
      dish("Sauce", "SAUCE", "SAUCE"),
      dish("Broth", "MAIN", "BROTH"),
      dish("Tofu", "MAIN", "PROTEIN")
    ];

    expect(dishes.sort((left, right) => compareMenuDishes(left, right, true)).map((item) => item.name)).toEqual(["Broth", "Tofu", "Sauce", "Tea"]);
  });

  it("orders Dinner dishes by category and then name", () => {
    const dishes = [dish("Tea", "DRINK"), dish("Zucchini", "SIDE"), dish("Beans", "SIDE"), dish("Curry", "MAIN")];

    expect(dishes.sort(compareMenuDishes).map((item) => item.name)).toEqual(["Curry", "Beans", "Zucchini", "Tea"]);
  });

  it("formats singular and plural serving counts", () => {
    expect(formatServings(1)).toBe("1 serving");
    expect(formatServings(2)).toBe("2 servings");
  });

  it("uses Dinner ordering for dishes also available as Hotpot staples", () => {
    const dishes = [dish("Fruit platter", "DESSERT"), dish("Steamed rice", "SIDE", "STAPLE"), dish("Curry", "MAIN")];
    expect(dishes.sort(compareMenuDishes).map((item) => item.name)).toEqual(["Curry", "Steamed rice", "Fruit platter"]);
  });

  it.each([
    ["DINNER", "Main"], ["POTLUCK", "Shared main"], ["BBQ", "Grill main"],
    ["PICNIC", "Portable main"], ["BRUNCH", "Brunch main"], ["OTHER", "Buffet main"]
  ])("uses %s meal roles even when a dish has Hotpot metadata", (eventType, role) => {
    expect(menuDishRole(dish("Shared tofu", "MAIN", "PROTEIN"), eventType as EventType)).toBe(role);
  });

  it("keeps Hotpot roles explicit and labels BBQ accompaniments", () => {
    expect(menuDishRole(dish("Broth", "MAIN", "BROTH"), "HOTPOT")).toBe("Broth");
    expect(menuDishRole(dish("Sauce", "SAUCE"), "BBQ")).toBe("Accompaniment");
  });

  it("estimates whole contributions at the finalized servings and ignores unowned readiness", () => {
    const base = { dish: { baseServings: 4, estimatedCostCents: 501 }, servings: 6 } as MenuPlanDish;
    expect(contributionCostCents(base)).toBe(752);
    expect(contributionSummary([
      { ...base, contributionGuestId: "guest-1", contributionReady: true },
      { ...base, servings: 2, contributionGuestId: "guest-2", contributionReady: false },
      { ...base, contributionReady: true }
    ])).toEqual({ claimedDishes: 2, readyDishes: 1, totalDishes: 3, contributedCostCents: 1003 });
  });
});
