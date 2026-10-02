import { describe, expect, it } from "vitest";
import type { MenuPlan, MenuPlanDish } from "@/lib/domain";
import { dishCatalog } from "@/lib/seed-data";
import { cookingGuides } from "@/lib/cooking-plan/catalog";
import { cookingReferences } from "@/lib/cooking-plan/references";
import { cookingGuideFor, cookingOrder, cookingSafetyNotes } from "@/lib/cooking-plan/planning";

const dish = (id: string, extra: Partial<MenuPlanDish> = {}): MenuPlanDish => ({
  dish: dishCatalog.find((item) => item.id === id)!, servings: 6, ...extra
});
const plan = (dishes: MenuPlanDish[]): MenuPlan => ({
  id: "plan", roomId: "room", title: "Dinner", summary: "", status: "FINALIZED",
  dishes, warnings: [], votes: [], score: 80, estimatedCostCents: 3000,
  createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z"
});

describe("ingredient-matched cooking guidance", () => {
  it("covers every built-in recipe with complete steps, equipment and resolvable primary references", () => {
    expect(Object.keys(cookingGuides).sort()).toEqual(dishCatalog.map((item) => item.id).sort());
    for (const recipe of dishCatalog) {
      const guide = cookingGuideFor(recipe);
      expect(guide, recipe.id).not.toBeNull();
      expect(guide!.steps.length, recipe.id).toBeGreaterThanOrEqual(4);
      expect(guide!.equipment.length, recipe.id).toBeGreaterThan(0);
      expect(guide!.steps.every((step) => step.trim().length > 15), recipe.id).toBe(true);
      for (const reference of guide!.referenceIds) {
        expect(cookingReferences[reference], recipe.id).toBeDefined();
        expect(new URL(cookingReferences[reference].url).protocol).toBe("https:");
        expect(cookingReferences[reference].difference.length).toBeGreaterThan(20);
      }
    }
  });

  it("does not reuse a trusted guide for an unknown, renamed or ingredient-modified recipe", () => {
    const recipe = dish("chicken-rice-tray").dish;
    expect(cookingGuideFor({ ...recipe, id: "__proto__" })).toBeNull();
    expect(cookingGuideFor({ ...recipe, id: "personal-chicken" })).toBeNull();
    expect(cookingGuideFor({ ...recipe, name: "A different chicken recipe" })).toBeNull();
    expect(cookingGuideFor({ ...recipe, baseServings: 8 })).toBeNull();
    expect(cookingGuideFor({ ...recipe, ingredients: recipe.ingredients.slice(1) })).toBeNull();
    expect(cookingGuideFor({ ...recipe, ingredients: recipe.ingredients.map((item, index) => index ? item : { ...item, quantity: 99 }) })).toBeNull();
    expect(cookingGuideFor({ ...recipe, ingredients: recipe.ingredients.map((item, index) => index ? item : { ...item, unit: "g" }) })).toBeNull();
    expect(cookingGuideFor({ ...recipe, ingredients: [...recipe.ingredients, dish("brunch-vegetable-frittata").dish.ingredients[0]] })).toBeNull();
  });

  it("keeps the guide stable when ingredient order changes or the menu's planned portions scale", () => {
    const recipe = dish("chicken-rice-tray").dish;
    const original = JSON.stringify(recipe);
    expect(cookingGuideFor({ ...recipe, ingredients: [...recipe.ingredients].reverse() })).toEqual(cookingGuideFor(recipe));
    const menu = plan([dish(recipe.id, { servings: 20 })]);
    expect(cookingOrder(menu, "DINNER")[0].tasks[0].item.servings).toBe(20);
    expect(JSON.stringify(recipe)).toBe(original);
  });

  it("treats package-only brownies as incomplete until required additions are reviewed", () => {
    const guide = cookingGuideFor(dish("brownies").dish)!;
    expect(guide.notice).toContain("not necessarily a complete");
    expect(guide.steps.join(" ")).toContain("review the shopping list and food restrictions");
    expect(guide.referenceIds).toEqual([]);
  });
});

describe("preparation ordering and safety", () => {
  it("puts long preparation before quick finishing, without claiming a meal duration", () => {
    const menu = plan([dish("garlic-bread"), dish("chicken-rice-tray"), dish("grilled-corn")]);
    const result = cookingOrder(menu, "DINNER");
    expect(result.map((group) => group.phase)).toEqual(["START", "COOK", "FINISH"]);
    expect(result.flatMap((group) => group.tasks.map(({ item }) => item.dish.id))).toEqual(["chicken-rice-tray", "grilled-corn", "garlic-bread"]);
    expect(cookingOrder({ ...menu, status: "PROPOSED" }, "DINNER")).toEqual([]);
  });

  it("keeps claimed Potluck dishes out of the host's preparation order without dropping their recipe", () => {
    const claimed = dish("chicken-rice-tray", { contributionGuestId: "maya", contributionReady: true });
    const menu = plan([claimed, dish("steamed-rice")]);
    expect(cookingOrder(menu, "POTLUCK").flatMap((group) => group.tasks.map(({ item }) => item.dish.id))).toEqual(["steamed-rice"]);
    expect(cookingGuideFor(claimed.dish)).not.toBeNull();
    expect(cookingOrder(menu, "DINNER").flatMap((group) => group.tasks).length).toBe(2);
  });

  it("asks for a recipe before cooking when a persisted dish no longer matches the catalog", () => {
    const changed = dish("chicken-rice-tray");
    changed.dish = { ...changed.dish, ingredients: [] };
    expect(cookingOrder(plan([changed]), "DINNER")[0].tasks[0].task).toContain("Find this dish's recipe instructions");
  });

  it("includes thermometer endpoints for the actual proteins, and safe picnic holding guidance", () => {
    const menu = plan([dish("chicken-rice-tray"), dish("salmon-rice-bowl"), dish("beef-bulgogi-rice-bowl"), dish("brunch-vegetable-frittata")]);
    const notes = cookingSafetyNotes(menu, "PICNIC");
    const text = notes.map((note) => note.text).join(" ");
    expect(text).toContain("74°C / 165°F");
    expect(text).toContain("63°C / 145°F");
    expect(text).toContain("3-minute rest");
    expect(text).toContain("71°C / 160°F");
    expect(text).toContain("4°C / 40°F");
    expect(text).toContain("1 hour above 32°C / 90°F");
    expect(text).toContain("insulated cooler");
    expect(notes.every((note) => new URL(note.url).hostname === "www.foodsafety.gov")).toBe(true);
  });

  it("includes leftover reheating for an egg-free menu without inventing seafood or egg instructions", () => {
    const text = cookingSafetyNotes(plan([dish("brunch-breakfast-potatoes")]), "BRUNCH").map((note) => note.text).join(" ");
    expect(text).toContain("reheated leftovers to 74°C / 165°F");
    expect(text).not.toContain("Cook egg dishes");
    expect(text).not.toContain("Cook fish");
    expect(text).not.toContain("Cook shrimp");
  });

  it("does not infer a safe hotpot dipping time or add protein warnings to a plant-only menu", () => {
    const menu = plan([dish("mushroom-hotpot-broth"), dish("hotpot-tofu")]);
    const text = cookingSafetyNotes(menu, "HOTPOT").map((note) => note.text).join(" ");
    expect(text).toContain("A brief dip is not a safety guarantee");
    expect(text).not.toContain("Cook chicken");
    expect(text).not.toContain("Ground beef");
  });
});
