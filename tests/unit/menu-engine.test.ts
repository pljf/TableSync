import { describe, expect, it } from "vitest";
import type { Guest, MenuGenerationResult } from "@/lib/domain";
import {
  dishMatchesTerms,
  dishMatchesAllergens,
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
  it("matches milk allergies to dairy ingredients and common plural allergen names", () => {
    expect(dishMatchesAllergens(dish("gluten-free-pasta-bake"), ["milk"])).toEqual(["milk"]);
    expect(dishMatchesAllergens(dish("peanut-sesame-noodles"), ["peanuts", "soya"])).toEqual(["peanuts"]);
    expect(dishMatchesAllergens(dish("tofu-vegetable-stir-fry"), ["soybeans"])).toEqual(["soybeans"]);
    expect(dishMatchesAllergens(dish("roasted-vegetables"), ["carrot", "onions"])).toEqual(["carrot", "onions"]);
    expect(dishMatchesAllergens(dish("tomato-hotpot-broth"), ["tomato"])).toEqual(["tomato"]);
  });

  it.each([
    ["gluten-free-pasta-bake", "milk allergy"],
    ["gluten-free-pasta-bake", "dairy products"],
    ["peanut-sesame-noodles", "sesame seeds"],
    ["peanut-sesame-noodles", "peanut allergy"],
    ["tofu-vegetable-stir-fry", "soy products"],
    ["roasted-vegetables", "carrot allergy"]
  ])("blocks %s for the qualified allergy %s", (dishId, allergy) => {
    const guest = { ...demoGuests[0], preference: { ...demoGuests[0].preference, allergies: [allergy] } };
    expect(dishMatchesAllergens(dish(dishId), [allergy])).toEqual([allergy]);
    expect(evaluateDishConstraints(dish(dishId), [guest]).allowed).toBe(false);
  });

  it("does not read allergen-free labels or unrelated word fragments as allergens", () => {
    expect(dishMatchesAllergens(dish("gluten-free-pasta-bake"), ["gluten", "wheat"])).toEqual([]);
    expect(dishMatchesAllergens(dish("coconut-rice-pudding"), ["milk", "nut", "nuts"])).toEqual([]);
    expect(dishMatchesAllergens(dish("peanut-sesame-noodles"), ["nut"])).toEqual(["nut"]);
    expect(dishMatchesAllergens(dish("gluten-free-pasta-bake"), ["gluten allergy", "wheat products"])).toEqual([]);
    expect(dishMatchesAllergens(dish("coconut-rice-pudding"), ["milk allergy", "nut products"])).toEqual([]);
    const freeOfAllergens = {
      ...dish("steamed-rice"),
      description: "Milk-free, dairy free, egg-free, peanut-free, nut free, soy-free, sesame-free and shellfish-free rice."
    };
    expect(dishMatchesAllergens(freeOfAllergens, [
      "milk allergy", "dairy products", "egg allergy", "peanut allergy", "nut products", "soy products", "sesame seeds", "shellfish allergy"
    ])).toEqual([]);
  });

  it("keeps sesame ingredients out of generated menus for a sesame-seeds allergy", () => {
    const guest = {
      ...demoGuests[0],
      preference: { ...demoGuests[0].preference, allergies: ["sesame seeds"], likes: ["peanut sesame noodles"], spiceLevel: "HOT" as const }
    };
    const plans = expectSuccessfulPlans(generateMenuPlans({
      room: { ...demoRoom, eventType: "DINNER", totalBudgetCents: 20000 }, guests: [guest], dishes: dishCatalog
    }));
    expect(plans.every((plan) => plan.dishes.every(({ dish }) =>
      dish.ingredients.every(({ ingredient }) => ingredient.id !== "sesame-oil" && !ingredient.tags.includes("sesame"))
    ))).toBe(true);
  });

  it("never lets a dish gluten-free label override a gluten-containing ingredient", () => {
    const mislabeledDish = { ...dish("beef-bulgogi-rice-bowl"), tags: ["gluten-free"] };
    expect(dietViolation(mislabeledDish, "GLUTEN_FREE")).toBe("contains gluten");
    expect(dietViolation(dish("gluten-free-pasta-bake"), "GLUTEN_FREE")).toBeNull();
  });

  it("still generates a safe Dinner for a declared gluten allergy", () => {
    const guest = { ...demoGuests[0], preference: { ...demoGuests[0].preference, allergies: ["gluten"] } };
    const plans = expectSuccessfulPlans(generateMenuPlans({ room: { ...demoRoom, eventType: "DINNER" }, guests: [guest], dishes: dishCatalog }));
    expect(plans.every((plan) => plan.dishes.every(({ dish }) => dishMatchesAllergens(dish, ["gluten"]).length === 0))).toBe(true);
  });

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

  it("counts distinct guests' likes while ignoring duplicate terms from one guest", () => {
    const guest = { ...demoGuests[0], preference: { ...demoGuests[0].preference, likes: ["rice"], dislikes: [] } };
    const repeated = { ...guest, preference: { ...guest.preference, likes: ["rice", "Rice", "rice"] } };
    const oneGuestScore = scoreDish(dish("steamed-rice"), [guest], demoRoom).score;
    expect(scoreDish(dish("steamed-rice"), [repeated], demoRoom).score).toBe(oneGuestScore);
    expect(scoreDish(dish("steamed-rice"), [guest, { ...guest, id: "another-guest" }], demoRoom).score).toBe(oneGuestScore + 10);
  });
});

describe("Dinner menu generation", () => {
  it("keeps lower-scoring mains when they are the only safe and affordable choice", () => {
    const lowScoringMain = { ...dish("tofu-vegetable-stir-fry"), estimatedCostCents: 1000, prepTimeMinutes: 1000 };
    const expensiveMains = Array.from({ length: 6 }, (_, index) => ({
      ...dish("chicken-taco-bowl"), id: `premium-${index}`, estimatedCostCents: 10000
    }));
    const dishes = [
      ...expensiveMains, lowScoringMain,
      ...["steamed-rice", "roasted-vegetables", "lemonade"].map((id) => ({ ...dish(id), estimatedCostCents: 100 }))
    ];
    const guests = [demoGuests[0], { ...demoGuests[1], preference: { ...demoGuests[1].preference, dietType: "VEGAN" as const } }];
    const plans = expectSuccessfulPlans(generateMenuPlans({
      room: { ...demoRoom, eventType: "DINNER", expectedGuests: 4, totalBudgetCents: 1300 }, guests, dishes
    }));
    expect(plans.every((plan) => plan.dishes.some(({ dish }) => dish.id === lowScoringMain.id))).toBe(true);
    expect(plans.every((plan) => plan.estimatedCostCents <= 1300)).toBe(true);
  });

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
  it("sizes restricted guests' only safe protein for their actual share of the group", () => {
    const guests = Array.from({ length: 6 }, (_, index) => ({
      ...demoGuests[0], id: `guest-${index}`,
      preference: { ...demoGuests[0].preference, dietType: index < 5 ? "VEGAN" as const : "OMNIVORE" as const }
    }));
    const plans = expectSuccessfulPlans(generateMenuPlans({
      room: { ...demoRoom, expectedGuests: 6, totalBudgetCents: 20000 }, guests, dishes: dishCatalog
    }));
    for (const plan of plans) {
      expect(plan.dishes.find(({ dish }) => dish.id === "hotpot-tofu")?.servings).toBe(6);
    }
  });

  it("does not discard the shared-safe broth before checking every guest", () => {
    const safeBroth = { ...dish("tomato-hotpot-broth"), prepTimeMinutes: 1000 };
    const unsafeBroths = Array.from({ length: 3 }, (_, index) => ({
      ...dish("hotpot-beef-slices"), id: `beef-broth-${index}`, hotpotRole: "BROTH" as const
    }));
    const guests = [demoGuests[0], { ...demoGuests[1], preference: { ...demoGuests[1].preference, dietType: "VEGAN" as const } }];
    const plans = expectSuccessfulPlans(generateMenuPlans({
      room: demoRoom, guests,
      dishes: [...dishCatalog.filter((dish) => dish.hotpotRole !== "BROTH"), ...unsafeBroths, safeBroth]
    }));
    expect(plans.every((plan) => plan.dishes.find(({ dish }) => dish.hotpotRole === "BROTH")?.dish.id === safeBroth.id)).toBe(true);
  });

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

  it("returns materially different alternatives instead of drink-only variants", () => {
    const plans = expectSuccessfulPlans(generateMenuPlans({ room: demoRoom, guests: demoGuests, dishes: dishCatalog }));
    const familyKeys = plans.map((plan) =>
      plan.dishes
        .map(({ dish }) => dish)
        .filter((item) => item.category !== "DRINK" && item.hotpotRole !== "SAUCE")
        .map((item) => item.id)
        .sort()
        .join("|")
    );

    expect(new Set(familyKeys).size).toBe(plans.length);
    expect(new Set(plans.map((plan) => plan.title)).size).toBe(plans.length);
    expect(Math.max(...plans.map((plan) => plan.score)) - Math.min(...plans.map((plan) => plan.score))).toBeLessThanOrEqual(10);
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

