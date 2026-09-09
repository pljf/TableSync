import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MenuPreparation } from "@/components/menu/menu-preparation";
import type { EventType, MenuPlan, MenuPlanDish } from "@/lib/domain";
import { preparationIngredients } from "@/lib/menu-preparation";
import { generateShoppingList } from "@/lib/shopping-engine/generate-shopping-list";

const dish: MenuPlanDish = {
  servings: 6,
  dish: {
    id: "beans", name: "Bean salad", category: "MAIN", cuisine: "Mediterranean",
    baseServings: 4, estimatedCostCents: 800, prepTimeMinutes: 15,
    spiceLevel: "NONE", spiceAdjustable: true, supportedEventTypes: ["DINNER", "POTLUCK"], tags: [],
    ingredients: [{ ingredient: { id: "beans", name: "White beans", category: "PANTRY", defaultUnit: "g", tags: [] }, quantity: 250, unit: "g" }]
  }
};
const plan: MenuPlan = {
  id: "menu", roomId: "room", title: "Shared meal", summary: "Dinner together", score: 80,
  estimatedCostCents: 1200, status: "FINALIZED", dishes: [dish], votes: [],
  warnings: [{ type: "SPICE_ADJUSTMENT", message: "Keep spicy sauce separate.", affectedGuestNames: [] }],
  createdAt: "2026-09-08T00:00:00Z", updatedAt: "2026-09-08T00:00:00Z"
};

describe("menu preparation", () => {
  it("scales finalized portions exactly as shopping does, without modifying the catalog", () => {
    const before = JSON.stringify(dish);
    const quantities = preparationIngredients(dish);
    expect(quantities[0].quantity).toBe(375);
    const shopping = generateShoppingList({
      room: { id: "room", hostId: "host", title: "Dinner", eventType: "DINNER", status: "FINALIZED", isPublicShareable: false, createdAt: plan.createdAt, updatedAt: plan.updatedAt },
      guests: [], plan
    });
    expect(quantities.map(({ quantity, unit }) => ({ quantity, unit }))).toEqual(shopping.map(({ quantity, unit }) => ({ quantity, unit })));
    expect(preparationIngredients({ ...dish, servings: 1.25 })[0].quantity).toBe(78.13);
    expect(JSON.stringify(dish)).toBe(before);
  });

  it.each(["DINNER", "HOTPOT", "POTLUCK", "BBQ", "PICNIC", "BRUNCH", "OTHER"] as EventType[])("offers portions, time, ingredients and adjustments for %s", (eventType) => {
    const html = renderToStaticMarkup(createElement(MenuPreparation, { plan, eventType, guests: [] }));
    expect(html).toContain("Prepare this menu");
    expect(html).toContain("6 servings");
    expect(html).toContain("About 15 min");
    expect(html).toContain("375 g");
    expect(html).toContain("Keep spicy sauce separate.");
    expect(html).toContain("Cooking steps aren’t included yet");
    expect(html).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/);
  });

  it("keeps a contributed dish's full recipe and shows who handles it", () => {
    const contributed = { ...plan, dishes: [{ ...dish, contributionGuestId: "maya", contributionReady: true }] };
    const html = renderToStaticMarkup(createElement(MenuPreparation, { plan: contributed, eventType: "POTLUCK", guests: [{ id: "maya", name: "Maya" }] }));
    expect(html).toContain("Maya is bringing this dish — ready to bring");
    expect(html).toContain("375 g");
    expect(html).not.toContain("included in shared shopping");
  });

  it("does not invent missing ingredients or preparation time", () => {
    const missing = { ...plan, dishes: [{ ...dish, dish: { ...dish.dish, prepTimeMinutes: 0, ingredients: [] } }] };
    const html = renderToStaticMarkup(createElement(MenuPreparation, { plan: missing, eventType: "DINNER", guests: [] }));
    expect(html).toContain("Prep time not listed");
    expect(html).toContain("Ingredients have not been listed");
  });

  it("does not present an unselected option as a meal to prepare", () => {
    expect(renderToStaticMarkup(createElement(MenuPreparation, { plan: { ...plan, status: "REJECTED" }, eventType: "DINNER", guests: [] }))).toBe("");
  });
});
