import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MenuPreparation } from "@/components/menu/menu-preparation";
import type { EventType, MenuPlan, MenuPlanDish } from "@/lib/domain";
import { dishCatalog } from "@/lib/seed-data";
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
    expect(html).toContain("Cooking guidance is not available for this recipe");
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

  it("renders authored steps and labels publisher techniques with their recipe differences", () => {
    const recipe = dishCatalog.find((item) => item.id === "chicken-rice-tray")!;
    const selected = { ...plan, dishes: [{ dish: recipe, servings: 6 }] };
    const html = renderToStaticMarkup(createElement(MenuPreparation, { plan: selected, eventType: "DINNER", guests: [] }));
    expect(html).toContain("Suggested preparation order");
    expect(html).toContain("Start ahead");
    expect(html).toContain("TableSync preparation notes");
    expect(html).toContain('aria-label="Preparation steps for Herb chicken and rice tray"');
    expect(html).toContain("74°C / 165°F");
    expect(html).toContain("https://www.recipetineats.com/oven-baked-chicken-and-rice/");
    expect(html).toContain("bone-in chicken");
    expect(html).toContain("butter (dairy)");
    expect(html).toContain("ingredients and cooking time do not match");
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain("(opens in a new tab)");
    expect(html).toContain("shopping amounts; use seasonings to taste");
    expect(html).toContain("Safe cooking temperatures");
    expect(html).toContain('aria-label="Food safety reminders"');
    expect(html).toContain('aria-label="Official food safety sources"');
    expect(html).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/);
  });

  it("keeps all contributed instructions visible while reporting that the host has no shared cooking tasks", () => {
    const recipe = dishCatalog.find((item) => item.id === "chicken-rice-tray")!;
    const contributed = { ...plan, dishes: [{ dish: recipe, servings: 6, contributionGuestId: "missing-guest" }] };
    const html = renderToStaticMarkup(createElement(MenuPreparation, { plan: contributed, eventType: "POTLUCK", guests: [] }));
    expect(html).toContain("Every dish is assigned to a contributor");
    expect(html).toContain("A contributor is bringing this dish");
    expect(html).toContain('aria-label="Preparation steps for Herb chicken and rice tray"');
    expect(html.split('class="preparation-dishes"')[0]).not.toContain("Herb chicken and rice tray");
    expect(html).not.toContain("included in shared shopping");
  });

  it("asks for the recipe owner's instructions when a built-in recipe has changed", () => {
    const recipe = dishCatalog.find((item) => item.id === "chicken-rice-tray")!;
    const selected = { ...plan, dishes: [{ dish: { ...recipe, name: "My chicken tray" }, servings: 6 }] };
    const html = renderToStaticMarkup(createElement(MenuPreparation, { plan: selected, eventType: "DINNER", guests: [] }));
    expect(html).toContain("Find this dish");
    expect(html).toContain("Cooking guidance is not available");
    expect(html).not.toContain('aria-label="Preparation steps for');
    expect(html).not.toContain("https://www.recipetineats.com");
  });

  it("surfaces incomplete packaged recipes before their cooking steps", () => {
    const recipe = dishCatalog.find((item) => item.id === "brownies")!;
    const selected = { ...plan, dishes: [{ dish: recipe, servings: 6 }] };
    const html = renderToStaticMarkup(createElement(MenuPreparation, { plan: selected, eventType: "DINNER", guests: [] }));
    expect(html).toContain("Package directions required");
    expect(html).toContain("not necessarily a complete brownie recipe");
    expect(html.indexOf("Package directions required")).toBeLessThan(html.indexOf('aria-label="Preparation steps'));
  });
});
