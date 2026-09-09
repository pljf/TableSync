import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MutationForm } from "@/components/ui/mutation-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));

describe("saved preference form readiness", () => {
  it("keeps saved native fields disabled until their hydration can retain typed changes", () => {
    const props = {
      action: async () => ({ status: "success" as const }), waitForHydration: true,
      children: createElement("textarea", { name: "notes", defaultValue: "Saved note" })
    };
    const html = renderToStaticMarkup(createElement(MutationForm, props));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('<fieldset aria-label="Meal preferences" disabled="" style="display:contents">');
    expect(html).toContain('name="notes">Saved note</textarea>');
  });

  it("keeps the existing immediate native-form behavior for other mutations", () => {
    const props = {
      action: async () => ({ status: "success" as const }), children: createElement("input", { name: "ready", type: "checkbox" })
    };
    const html = renderToStaticMarkup(createElement(MutationForm, props));
    expect(html).not.toContain("fieldset");
    expect(html).not.toContain('aria-busy="true"');
  });
});
