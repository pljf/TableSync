import { describe, expect, it } from "vitest";
import type { Guest } from "@/lib/domain";
import { dishMatchesTerms, dietViolation, evaluateDishConstraints } from "@/lib/menu-engine/constraints";
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

  it("returns top plans whose dishes satisfy all hard constraints", () => {
    const plans = generateMenuPlans({ room: demoRoom, guests: demoGuests, dishes: dishCatalog });

    expect(plans).toHaveLength(3);
    for (const plan of plans) {
      expect(plan.dishes.length).toBeGreaterThan(0);
      for (const planDish of plan.dishes) {
        expect(evaluateDishConstraints(planDish.dish, demoGuests).allowed).toBe(true);
      }
    }
  });
});

