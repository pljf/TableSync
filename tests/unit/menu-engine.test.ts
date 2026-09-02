import { describe, expect, it } from "vitest";
import type { Guest, MenuGenerationResult } from "@/lib/domain";
import {
  dishMatchesTerms,
  dietViolation,
  evaluateDishConstraints,
  evaluateDishForGuest,
  evaluatePlanCoverage
} from "@/lib/menu-engine/constraints";
import { generateMenuPlans } from "@/lib/menu-engine/generate-menu-plans";
import { scoreDish } from "@/lib/menu-engine/score-dish";
import { demoGuests, demoRoom, dishCatalog } from "@/lib/seed-data";

function dish(id: string) {
  const match = dishCatalog.find((item) => item.id === id);
  if (!match) {
    throw new Error(`Missing test dish ${id}`);
  }
  return match;
}

function expectSuccessfulPlans(result: MenuGenerationResult) {
  expect(result.kind).toBe("success");
  if (result.kind !== "success") {
    throw new Error(`Expected successful menu generation, received: ${result.report.summary}`);
  }
  return result.plans;
}

describe("menu engine constraints", () => {
  it("excludes dishes that match a guest allergy", () => {
    const peanutNoodles = dish("peanut-sesame-noodles");
    const jordan = demoGuests.find((guest) => guest.name === "Jordan");

    expect(jordan).toBeDefined();
    expect(dishMatchesTerms(peanutNoodles, ["peanut"])).toContain("peanut");
    expect(evaluateDishConstraints(peanutNoodles, [jordan as Guest]).allowed).toBe(false);
  });

  it("excludes meat dishes for vegetarian guests", () => {
    const beefBulgogi = dish("beef-bulgogi-rice-bowl");

    expect(dietViolation(beefBulgogi, "VEGETARIAN")).toBe("contains meat or seafood");
  });

  it("keeps a diet-specific dish eligible when another guest can eat it", () => {
    const beefBulgogi = dish("beef-bulgogi-rice-bowl");
    const alex = demoGuests.find((guest) => guest.name === "Alex");
    const maya = demoGuests.find((guest) => guest.name === "Maya");

    expect(alex).toBeDefined();
    expect(maya).toBeDefined();

    const result = evaluateDishConstraints(beefBulgogi, [alex as Guest, maya as Guest]);
    expect(result.allowed).toBe(true);
    expect(result.blockedBy).toContain("Maya");
    expect(result.blockedBy).not.toContain("Alex");
  });

  it("requires a safe main and side for every guest at plan level", () => {
    const alex = demoGuests.find((guest) => guest.name === "Alex");
    const maya = demoGuests.find((guest) => guest.name === "Maya");
    expect(alex).toBeDefined();
    expect(maya).toBeDefined();

    const guests = [alex as Guest, maya as Guest];
    const covered = evaluatePlanCoverage(
      [dish("beef-bulgogi-rice-bowl"), dish("tofu-vegetable-stir-fry"), dish("roasted-vegetables")],
      guests
    );
    const uncovered = evaluatePlanCoverage([dish("beef-bulgogi-rice-bowl"), dish("roasted-vegetables")], guests);

    expect(covered.every((item) => item.covered)).toBe(true);
    expect(uncovered.find((item) => item.guestName === "Maya")).toMatchObject({
      hasSafeMain: false,
      hasSafeSide: true,
      covered: false
    });
  });

  it("allows optional spice adjustments but rejects intrinsic spice above tolerance", () => {
    const jordan = demoGuests.find((guest) => guest.name === "Jordan");
    expect(jordan).toBeDefined();

    const curry = dish("chickpea-curry");
    const optionalSpice = evaluateDishForGuest({ ...curry, spiceAdjustable: true }, jordan as Guest);
    const intrinsicSpice = evaluateDishForGuest({ ...curry, spiceAdjustable: false }, jordan as Guest);

    expect(optionalSpice).toMatchObject({ safe: true, requiresSpiceAdjustment: true });
    expect(intrinsicSpice).toMatchObject({ safe: false, requiresSpiceAdjustment: false });
  });

  it("increases score when a dish matches stated likes", () => {
    const beefBulgogi = dish("beef-bulgogi-rice-bowl");
    const alex = demoGuests.find((guest) => guest.name === "Alex");
    expect(alex).toBeDefined();

    const withoutLikes: Guest = {
      ...(alex as Guest),
      preference: {
        ...(alex as Guest).preference,
        likes: []
      }
    };

    expect(scoreDish(beefBulgogi, [alex as Guest], demoRoom).score).toBeGreaterThan(
      scoreDish(beefBulgogi, [withoutLikes], demoRoom).score
    );
  });

  it("returns top plans with no global allergy conflicts", () => {
    const plans = expectSuccessfulPlans(generateMenuPlans({ room: demoRoom, guests: demoGuests, dishes: dishCatalog }));

    expect(plans).toHaveLength(3);
    for (const plan of plans) {
      expect(plan.dishes.length).toBeGreaterThan(0);
      for (const planDish of plan.dishes) {
        expect(evaluateDishConstraints(planDish.dish, demoGuests).allowed).toBe(true);
      }
    }
  });
});

describe("Dinner menu generation", () => {
  it("returns only in-budget Dinner structures that cover every guest", () => {
    const alex = demoGuests.find((guest) => guest.name === "Alex");
    const maya = demoGuests.find((guest) => guest.name === "Maya");
    expect(alex).toBeDefined();
    expect(maya).toBeDefined();

    const guests = [alex as Guest, maya as Guest];
    const room = {
      ...demoRoom,
      eventType: "DINNER" as const,
      expectedGuests: 2,
      totalBudgetCents: 8000
    };
    const plans = expectSuccessfulPlans(generateMenuPlans({ room, guests, dishes: dishCatalog }));

    expect(plans).toHaveLength(3);
    for (const plan of plans) {
      const dishes = plan.dishes.map((item) => item.dish);
      const mainCount = dishes.filter((item) => item.category === "MAIN").length;
      const sideCount = dishes.filter((item) => item.category === "SIDE").length;
      const drinkCount = dishes.filter((item) => item.category === "DRINK").length;

      expect(mainCount).toBeGreaterThanOrEqual(1);
      expect(mainCount).toBeLessThanOrEqual(2);
      expect(sideCount).toBe(2);
      expect(drinkCount).toBe(1);
      expect(plan.estimatedCostCents).toBeLessThanOrEqual(room.totalBudgetCents);
      expect(evaluatePlanCoverage(dishes, guests).every((item) => item.covered)).toBe(true);
    }
  });
});

describe("Hotpot menu generation", () => {
  it("returns role-complete in-budget plans with safe broth and guest coverage", () => {
    const plans = expectSuccessfulPlans(generateMenuPlans({ room: demoRoom, guests: demoGuests, dishes: dishCatalog }));

    expect(plans).toHaveLength(3);
    for (const plan of plans) {
      const dishes = plan.dishes.map((item) => item.dish);
      const roleCount = (role: string) =>
        dishes.filter((item) => (item as typeof item & { hotpotRole?: string }).hotpotRole === role).length;
      const broth = dishes.find(
        (item) => (item as typeof item & { hotpotRole?: string }).hotpotRole === "BROTH"
      );

      expect(roleCount("BROTH")).toBe(1);
      expect(roleCount("PROTEIN")).toBe(2);
      expect(roleCount("VEGETABLE")).toBe(2);
      expect(roleCount("STAPLE")).toBe(1);
      expect(roleCount("SAUCE")).toBe(2);
      expect(roleCount("DRINK")).toBe(1);
      expect(broth).toBeDefined();
      expect(demoGuests.every((guest) => evaluateDishForGuest(broth!, guest).safe)).toBe(true);
      expect(plan.estimatedCostCents).toBeLessThanOrEqual(demoRoom.totalBudgetCents!);

      for (const guest of demoGuests) {
        const safeRoles = dishes
          .filter((item) => evaluateDishForGuest(item, guest).safe)
          .map((item) => (item as typeof item & { hotpotRole?: string }).hotpotRole);
        expect(safeRoles).toContain("PROTEIN");
        expect(safeRoles.some((role) => role === "VEGETABLE" || role === "STAPLE")).toBe(true);
      }
    }
  });
});

describe("No-solution reporting", () => {
  it("returns a budget report and a clearly separated closest-over-budget reference", () => {
    const room = {
      ...demoRoom,
      eventType: "DINNER" as const,
      totalBudgetCents: 100
    };
    const result = generateMenuPlans({ room, guests: demoGuests, dishes: dishCatalog });

    expect(result.kind).toBe("no-solution");
    if (result.kind !== "no-solution") {
      return;
    }

    expect(result.report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BUDGET_LIMIT",
          affectedGuestNames: demoGuests.map((guest) => guest.name)
        })
      ])
    );
    expect(result.report.closestOverBudgetPlan).toMatchObject({
      budgetCents: 100
    });
    expect(result.report.closestOverBudgetPlan!.estimatedCostCents).toBeGreaterThan(100);
    expect(result.report.closestOverBudgetPlan!.overByCents).toBe(
      result.report.closestOverBudgetPlan!.estimatedCostCents - 100
    );
  });

  it("identifies a missing Hotpot role without returning an empty accepted plan", () => {
    const result = generateMenuPlans({
      room: demoRoom,
      guests: demoGuests,
      dishes: dishCatalog.filter((item) => item.hotpotRole !== "BROTH")
    });

    expect(result.kind).toBe("no-solution");
    if (result.kind !== "no-solution") {
      return;
    }
    expect(result.report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_REQUIRED_DISH",
          message: expect.stringContaining("broth")
        })
      ])
    );
    expect("plans" in result).toBe(false);
  });
});

