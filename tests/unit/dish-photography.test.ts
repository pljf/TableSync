import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FoodIcon } from "@/components/menu/food-icon";
import { dishPhotography } from "@/lib/dish-photography";
import { photos } from "@/lib/photo-library";

describe("real dish photography", () => {
  it("uses a matching photographed recipe with its source and reuse terms", () => {
    const photo = dishPhotography("chickpea-curry");
    expect(photo?.src).toBe("/images/photography/chickpea-curry.webp");
    expect(photo?.author).toBeTruthy();
    expect(photo?.source).toMatch(/^https:\/\//);
    expect(photo?.licenseUrl).toMatch(/^https:\/\//);
  });

  it.each(["lentil-rice-bake", "new-recipe", "shared-table", "table-preparation"])("does not substitute another meal for %s", (id) => {
    expect(dishPhotography(id)).toBeUndefined();
  });

  it("renders a category icon for an unphotographed recipe", () => {
    const markup = renderToStaticMarkup(createElement(FoodIcon, {
      dish: { id: "lentil-rice-bake", category: "MAIN" }
    }));
    expect(markup).toContain("<svg");
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("/images/dishes/");
  });

  it("renders the real photograph for a known recipe without loading an AI illustration", () => {
    const markup = renderToStaticMarkup(createElement(FoodIcon, {
      dish: { id: "chickpea-curry", category: "MAIN" }
    }));
    expect(markup).toContain("<img");
    expect(decodeURIComponent(markup)).toContain("/images/photography/chickpea-curry.webp");
    expect(markup).not.toContain("/images/dishes/");
  });

  it("keeps every credited local photograph available", () => {
    for (const photo of photos) {
      expect(existsSync(`public${photo.src}`), photo.src).toBe(true);
    }
  });
});
