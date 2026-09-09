import { describe, expect, it } from "vitest";
import type { Dish, EventType, Guest, MenuGenerationResult } from "@/lib/domain";
import { eventFormats } from "@/lib/event-formats";
import { dietViolation, dishMatchesAllergens, evaluateDishForGuest, evaluatePlanCoverage } from "@/lib/menu-engine/constraints";
import { generateMenuPlans } from "@/lib/menu-engine/generate-menu-plans";
import { demoGuests, demoRoom, dishCatalog, eventTypes } from "@/lib/seed-data";

const addedFormats: EventType[] = ["POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"];

function plansFrom(result: MenuGenerationResult) {
  if (result.kind !== "success") throw new Error(result.report.summary + JSON.stringify(result.report.issues));
  expect(result.plans.length).toBeGreaterThan(0);
  return result.plans;
}

function reportFrom(result: MenuGenerationResult) {
  if (result.kind !== "no-solution") throw new Error("Expected no solution, received an accepted menu");
  expect("plans" in result).toBe(false);
  return result.report;
}

function generate(eventType: EventType, options: { guests?: Guest[]; dishes?: Dish[]; budget?: number; expectedGuests?: number } = {}) {
  return generateMenuPlans({
    room: { ...demoRoom, eventType, totalBudgetCents: options.budget ?? 25000, expectedGuests: options.expectedGuests ?? 6 },
    guests: options.guests ?? demoGuests,
    dishes: options.dishes ?? dishCatalog
  });
}

function guestWith(id: string, dietType: Guest["preference"]["dietType"], overrides: Partial<Guest["preference"]> = {}): Guest {
  return {
    ...demoGuests[0], id, name: id,
    preference: { ...demoGuests[0].preference, id: `${id}-preference`, guestId: id, dietType, spiceLevel: "NONE", likes: [], dislikes: [], allergies: [], ...overrides }
  };
}

describe("expanded gathering menus", () => {
  it("makes all seven planned formats selectable", () => {
    expect(eventTypes).toEqual(["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"]);
    expect(eventFormats.OTHER.description).toContain("shared buffet");
  });

  it.each(addedFormats)("builds a complete %s menu with suitable food and guest coverage", (eventType) => {
    const plans = plansFrom(generate(eventType));
    expect(plans).toHaveLength(3);
    for (const plan of plans) {
      const dishes = plan.dishes.map(({ dish }) => dish);
      const category = (value: Dish["category"]) => dishes.filter((dish) => dish.category === value);
      expect(dishes.every((dish) => dish.supportedEventTypes.includes(eventType))).toBe(true);
      expect(evaluatePlanCoverage(dishes, demoGuests).every((guest) => guest.covered)).toBe(true);
      expect(category("DRINK")).toHaveLength(1);
      expect(plan.estimatedCostCents).toBeLessThanOrEqual(25000);
      expect(new Set(dishes.map((dish) => dish.id)).size).toBe(dishes.length);
      const mainCount = category("MAIN").length;
      expect(mainCount).toBeGreaterThanOrEqual(1);
      expect(mainCount).toBeLessThanOrEqual(2);
      if (eventType === "POTLUCK") {
        expect(mainCount).toBe(2);
        expect(category("SIDE")).toHaveLength(2);
        expect(category("DESSERT")).toHaveLength(1);
        expect(dishes.filter((dish) => dish.category !== "DRINK").every((dish) => dish.tags.includes("shareable"))).toBe(true);
      } else if (eventType === "BBQ") {
        expect(mainCount).toBe(2);
        expect(category("SIDE")).toHaveLength(2);
        expect(category("SAUCE")).toHaveLength(1);
        expect(category("MAIN").every((dish) => dish.tags.includes("grilled"))).toBe(true);
        expect(category("MAIN").some((dish) => dish.tags.includes("vegan") && !dietViolation(dish, "VEGAN"))).toBe(true);
      } else if (eventType === "PICNIC") {
        expect(category("SIDE")).toHaveLength(2);
        expect(category("DESSERT")).toHaveLength(1);
        expect(dishes.filter((dish) => dish.category !== "DRINK").every((dish) => dish.tags.includes("portable"))).toBe(true);
      } else if (eventType === "BRUNCH") {
        expect(category("SIDE")).toHaveLength(2);
        expect(category("SIDE").filter((dish) => dish.tags.includes("savory"))).toHaveLength(1);
        expect(category("SIDE").filter((dish) => dish.tags.includes("fruit"))).toHaveLength(1);
        expect(category("MAIN").every((dish) => dish.tags.includes("brunch"))).toBe(true);
      } else {
        expect(category("SIDE")).toHaveLength(1);
        expect(category("APPETIZER")).toHaveLength(1);
        expect(dishes.filter((dish) => dish.category !== "DRINK").every((dish) => dish.tags.includes("buffet"))).toBe(true);
      }
    }
  });

  it.each(addedFormats)("keeps %s deterministic regardless of catalog and guest ordering", (eventType) => {
    const initial = generate(eventType);
    expect(generate(eventType)).toEqual(initial);
    expect(generate(eventType, { dishes: [...dishCatalog].reverse(), guests: [...demoGuests].reverse() })).toEqual(initial);
    const families = plansFrom(initial).map((plan) => plan.dishes
      .filter(({ dish }) => dish.category !== "DRINK" && dish.category !== "SAUCE")
      .map(({ dish }) => dish.id).sort().join("|"));
    expect(new Set(families).size).toBe(families.length);
    expect(new Set(plansFrom(initial).map((plan) => plan.title)).size).toBe(families.length);
  });

  it.each(addedFormats)("excludes allergies globally while covering strict diets and spice needs for %s", (eventType) => {
    const guests = [
      guestWith("Vegan", "VEGAN"),
      guestWith("Gluten free", "GLUTEN_FREE"),
      guestWith("Allergies", "OMNIVORE", { allergies: ["milk", "eggs", "soy", "peanuts", "wheat"] }),
      guestWith("Vegetarian", "VEGETARIAN"),
      guestWith("Pescatarian", "PESCATARIAN"),
      guestWith("Halal", "HALAL"),
      guestWith("Kosher", "KOSHER")
    ];
    for (const plan of plansFrom(generate(eventType, { guests }))) {
      const dishes = plan.dishes.map(({ dish }) => dish);
      expect(dishes.every((dish) => dishMatchesAllergens(dish, guests[2].preference.allergies).length === 0)).toBe(true);
      expect(evaluatePlanCoverage(dishes, guests).every((coverage) => coverage.covered)).toBe(true);
      for (const guest of guests) {
        const safeMains = plan.dishes.filter(({ dish }) => dish.category === "MAIN" && evaluateDishForGuest(dish, guest).safe);
        expect(safeMains.reduce((sum, item) => sum + item.servings, 0)).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it.each(addedFormats)("does not force intrinsic hot mains on a spice-intolerant %s guest", (eventType) => {
    const dishes = dishCatalog.map((dish) => dish.category === "MAIN" ? { ...dish, spiceLevel: "HOT" as const, spiceAdjustable: false } : dish);
    const report = reportFrom(generate(eventType, { dishes, guests: [guestWith("No spice", "OMNIVORE")] }));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "GUEST_COVERAGE", affectedGuestNames: ["No spice"] })]));
    const adjustable = dishes.map((dish) => dish.category === "MAIN" ? { ...dish, spiceAdjustable: true } : dish);
    const recovered = plansFrom(generate(eventType, { dishes: adjustable, guests: [guestWith("No spice", "OMNIVORE")] }));
    expect(recovered.every((plan) => plan.warnings.some((warning) => warning.type === "SPICE_ADJUSTMENT"))).toBe(true);
  });

  it.each(addedFormats)("reports missing %s dishes with the right label and recovers after the catalog is restored", (eventType) => {
    const report = reportFrom(generate(eventType, { dishes: dishCatalog.filter((dish) => !dish.supportedEventTypes.includes(eventType)) }));
    expect(report.eventType).toBe(eventType);
    expect(report.summary).toContain(eventFormats[eventType].label);
    expect(report.summary).not.toContain("Dinner");
    expect(report.issues.some((issue) => issue.code === "MISSING_REQUIRED_DISH")).toBe(true);
    expect(report.closestOverBudgetPlan).toBeUndefined();
    expect(generate(eventType).kind).toBe("success");
  });

  it.each(addedFormats)("never substitutes another food for a missing %s drink", (eventType) => {
    const report = reportFrom(generate(eventType, { dishes: dishCatalog.filter((dish) => dish.category !== "DRINK") }));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "MISSING_REQUIRED_DISH", message: expect.stringContaining("drink") })]));
  });

  it.each(addedFormats)("enforces the exact minimum budget for a complete %s menu", (eventType) => {
    const report = reportFrom(generate(eventType, { budget: 1 }));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "BUDGET_LIMIT" })]));
    const reference = report.closestOverBudgetPlan!;
    expect(reference.budgetCents).toBe(1);
    expect(reference.overByCents).toBe(reference.estimatedCostCents - 1);
    expect(reference.dishNames.length).toBeGreaterThanOrEqual(4);
    const stillTooLow = reportFrom(generate(eventType, { budget: reference.estimatedCostCents - 1 }));
    expect(stillTooLow.closestOverBudgetPlan?.overByCents).toBe(1);
    const accepted = plansFrom(generate(eventType, { budget: reference.estimatedCostCents }));
    expect(accepted.every((plan) => plan.estimatedCostCents === reference.estimatedCostCents)).toBe(true);
  });

  it.each(addedFormats)("scales %s portions for expected guests and for larger actual attendance", (eventType) => {
    for (const [expectedGuests, actualGuests] of [[20, 6], [2, 12]]) {
      const guests = Array.from({ length: actualGuests }, (_, index) => guestWith(`Vegan ${index}`, "VEGAN"));
      const count = Math.max(expectedGuests, actualGuests);
      const plans = plansFrom(generate(eventType, { expectedGuests, guests, budget: 100000 }));
      for (const plan of plans) {
        const mains = plan.dishes.filter(({ dish }) => dish.category === "MAIN");
        expect(mains.reduce((sum, item) => sum + item.servings, 0)).toBeGreaterThanOrEqual(count);
        expect(plan.dishes.filter(({ dish }) => dish.category !== "MAIN").every((item) => item.servings >= count)).toBe(true);
        expect(plan.estimatedCostCents).toBe(plan.dishes.reduce((sum, item) => sum + Math.round(item.dish.estimatedCostCents * item.servings / item.dish.baseServings), 0));
      }
    }
  });

  it("allocates enough Potluck portions to the only main that six vegan guests can eat", () => {
    const mainIds = new Set(["lentil-rice-bake", "chicken-rice-tray"]);
    const dishes = dishCatalog.filter((dish) => dish.category !== "MAIN" || mainIds.has(dish.id));
    const guests = [...Array.from({ length: 6 }, (_, index) => guestWith(`Vegan ${index}`, "VEGAN")), guestWith("Omnivore", "OMNIVORE")];
    for (const plan of plansFrom(generate("POTLUCK", { guests, dishes, expectedGuests: 2 }))) {
      expect(plan.dishes.find(({ dish }) => dish.id === "lentil-rice-bake")?.servings).toBe(7);
      expect(plan.dishes.find(({ dish }) => dish.id === "chicken-rice-tray")?.servings).toBe(1);
    }
  });

  it("requires a real plant-based BBQ main even when meat carries an incorrect vegan tag", () => {
    const chicken = dishCatalog.find((dish) => dish.id === "bbq-chicken-skewers")!;
    const meatMains = [chicken, { ...chicken, id: "mislabelled-chicken", tags: [...chicken.tags, "vegan"] }];
    const dishes = [...dishCatalog.filter((dish) => dish.category !== "MAIN"), ...meatMains];
    const report = reportFrom(generate("BBQ", { dishes, guests: [guestWith("Omnivore", "OMNIVORE", { spiceLevel: "HOT" })] }));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining("plant-based grilled main") })]));
  });

  it("requires a fruit side for Brunch and an appetizer for the general buffet", () => {
    expect(reportFrom(generate("BRUNCH", { dishes: dishCatalog.filter((dish) => !dish.tags.includes("fruit")) })).issues)
      .toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining("fruit side") })]));
    expect(reportFrom(generate("OTHER", { dishes: dishCatalog.filter((dish) => dish.category !== "APPETIZER") })).issues)
      .toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining("buffet appetizer") })]));
  });

  it.each(["PICNIC", "BBQ", "BRUNCH"] as EventType[])("rejects dishes falsely enabled for %s without the required preparation role", (eventType) => {
    const dishes = dishCatalog.map((dish) => dish.category === "MAIN" ? { ...dish, tags: dish.tags.filter((tag) => !["portable", "grilled", "brunch"].includes(tag)) } : dish);
    expect(reportFrom(generate(eventType, { dishes })).issues.some((issue) => issue.code === "MISSING_REQUIRED_DISH")).toBe(true);
  });
});
