import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MenuComparison } from "@/components/menu/menu-comparison";
import type { Dish, MenuPlan, MenuPlanDish, Vote } from "@/lib/domain";
import { summarizeMenuComparison } from "@/lib/menu-comparison";

function dish(id: string, name: string, category: Dish["category"] = "MAIN", servings = 4): MenuPlanDish {
  return {
    servings,
    dish: { id, name, category, cuisine: "Mediterranean", baseServings: 4, estimatedCostCents: 1200,
      prepTimeMinutes: 20, spiceLevel: "MILD", spiceAdjustable: false, supportedEventTypes: ["DINNER"], tags: [], ingredients: [] }
  };
}

function plan(id: string, dishes: MenuPlanDish[], title = "A relaxed dinner", votes: Vote[] = []): MenuPlan {
  return { id, roomId: "room-1", title, summary: "A complete meal", score: 90, dishes, estimatedCostCents: 4000,
    status: "PROPOSED", warnings: [], votes, createdAt: "2026-09-08T00:00:00Z", updatedAt: "2026-09-08T00:00:00Z" };
}

function vote(guestId: string, value: Vote["value"], planId = "one"): Vote {
  return { id: `${planId}-${guestId}`, planId, guestId, value,
    createdAt: "2026-09-08T00:00:00Z", updatedAt: "2026-09-08T00:00:00Z" };
}

describe("clear menu comparison names", () => {
  it("identifies repeated titles by a distinctive dish while preserving specific titles and input order", () => {
    const rice = dish("rice", "Steamed rice", "SIDE");
    const menus = [
      plan("one", [rice, dish("beans", "White bean stew")]),
      plan("two", [dish("lentils", "Lentil stew"), rice], " A RELAXED DINNER "),
      plan("three", [rice], "Rice supper")
    ];
    const before = JSON.stringify(menus);

    const comparison = summarizeMenuComparison(menus, 4, "DINNER");

    expect(comparison.options.map(({ displayTitle }) => displayTitle)).toEqual(["White bean stew", "Lentil stew", "Rice supper"]);
    expect(comparison.options.map(({ plan, optionNumber }) => [plan.id, optionNumber])).toEqual([["one", 1], ["two", 2], ["three", 3]]);
    expect(JSON.stringify(menus)).toBe(before);
  });

  it("uses a dish pair when each dish appears in another option", () => {
    const beans = dish("beans", "Bean stew");
    const rice = dish("rice", "Steamed rice", "SIDE");
    const greens = dish("greens", "Leafy greens", "SIDE");
    const menus = [plan("one", [rice, beans]), plan("two", [greens, beans]), plan("three", [rice, greens])];

    const titles = summarizeMenuComparison(menus, 4, "DINNER").options.map(({ displayTitle }) => displayTitle);

    expect(new Set(titles).size).toBe(3);
    expect(titles[0]).toBe("Bean stew + Steamed rice");
    expect(titles[1]).toBe("Bean stew + Leafy greens");
    expect(titles[2]).toContain("Leafy greens");
    expect(titles[2]).toContain("Steamed rice");
  });

  it("makes portion-only alternatives distinct and keeps identical menus honestly named", () => {
    const first = plan("one", [dish("beans", "Bean stew", "MAIN", 4)]);
    const second = plan("two", [dish("beans", "Bean stew", "MAIN", 6)]);
    expect(summarizeMenuComparison([first, second], 6, "DINNER").options.map(({ displayTitle }) => displayTitle))
      .toEqual(["Bean stew (4 servings)", "Bean stew (6 servings)"]);

    const identical = summarizeMenuComparison([first, { ...first, id: "three" }], 4, "DINNER");
    expect(identical.options.map(({ displayTitle }) => displayTitle)).toEqual([first.title, first.title]);
    expect(identical.options.every(({ differentDishes }) => differentDishes.length === 0)).toBe(true);
  });

  it("describes the shorter option when another menu only adds dishes", () => {
    const beans = dish("beans", "Bean stew");
    const menus = [
      plan("one", [beans]),
      plan("two", [beans, dish("rice", "Steamed rice", "SIDE")]),
      plan("three", [dish("lentils", "Lentil stew")], "Lentil supper")
    ];
    expect(summarizeMenuComparison(menus, 4, "DINNER").options.map(({ displayTitle }) => displayTitle))
      .toEqual(["Bean stew", "Steamed rice", "Lentil supper"]);
  });
});

describe("menu voting participation", () => {
  const guests = [{ id: "alex", name: "Alex" }, { id: "sam", name: "Sam" }, { id: "jo", name: "Jo" }];

  it("counts joined guests per menu, treats every vote type as participation, and retains planned headcount for cost", () => {
    const menus = [
      plan("one", [dish("beans", "Bean stew")], undefined, [vote("alex", "NEUTRAL"), vote("sam", "VETO")]),
      plan("two", [dish("rice", "Rice")], undefined, [vote("jo", "LIKE", "two")])
    ];
    const comparison = summarizeMenuComparison(menus, 8, "DINNER", guests);

    expect(comparison.headcount).toBe(8);
    expect(comparison.options.map(({ perPersonCents }) => perPersonCents)).toEqual([500, 500]);
    expect(comparison.options[0].participation).toEqual({ joinedCount: 3, votedCount: 2, waitingGuests: [guests[2]] });
    expect(comparison.options[1].participation).toEqual({ joinedCount: 3, votedCount: 1, waitingGuests: [guests[0], guests[1]] });
    expect(comparison.options[0]).toMatchObject({ likes: 0, neutral: 1, vetoes: 1 });
  });

  it("does not invent waiting voters when participant records are unavailable or duplicate", () => {
    const menu = plan("one", [dish("beans", "Bean stew")], undefined, [vote("alex", "LIKE")]);
    expect(summarizeMenuComparison([menu], 8, "DINNER").options[0].participation).toBeUndefined();
    expect(summarizeMenuComparison([menu], 8, "DINNER", []).options[0].participation)
      .toEqual({ joinedCount: 0, votedCount: 0, waitingGuests: [] });
    expect(summarizeMenuComparison([menu], 8, "DINNER", [guests[0], guests[0]]).options[0].participation)
      .toEqual({ joinedCount: 1, votedCount: 1, waitingGuests: [] });
  });

  it("shows participation and waiting names separately from food estimates, with a collapsed explanation of ranking", () => {
    const menus = [
      plan("one", [dish("beans", "Bean stew")], undefined, [vote("alex", "LIKE")]),
      plan("two", [dish("rice", "Rice")])
    ];
    const html = renderToStaticMarkup(createElement(MenuComparison, { plans: menus, plannedGuestCount: 8, eventType: "DINNER", guests }));

    expect(html).toContain("Estimates for 8 planned guests");
    expect(html).toContain("1 of 3 joined guests have voted");
    expect(html).toContain("0 of 3 joined guests have voted");
    expect(html).toContain("Waiting for 2 guests");
    expect(html).toContain("<li>Sam</li><li>Jo</li>");
    expect(html).toContain("Guest votes are shown separately and do not change this order.");
    expect(html).toContain('<details class="menu-shared-dishes"><summary>How menu suggestions work</summary>');
    expect(html).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/);
    expect(html).not.toContain("score");
  });
});
