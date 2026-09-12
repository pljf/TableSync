import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: vi.fn(), sessionReady: true }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: state.user }));
vi.mock("@/lib/auth-environment", () => ({ authEnvironment: { get sessionReady() { return state.sessionReady; } } }));
vi.mock("@/components/auth/guest-sign-in-button", () => ({
  GuestSignInButton: ({ disabled }: { disabled: boolean }) => createElement("button", { disabled }, "Continue as guest")
}));
import HomePage from "@/app/page";

describe("editorial landing connects to the real product", () => {
  beforeEach(() => { state.user.mockResolvedValue(null); state.sessionReady = true; });

  it("starts the guest flow and sends both planning calls to the real creation route", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain(">Continue as guest</button>");
    expect(html.match(/href="\/rooms\/new"/g)).toHaveLength(2);
    expect(html).not.toContain('href="/preview?view=new"');
    expect(html).toContain("Interactive example");
  });

  it("opens the actual host dashboard for a signed-in user", async () => {
    state.user.mockResolvedValue({ id: "host-1" });
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toMatch(/href="\/dashboard"[^>]*>Open your gatherings/);
    expect(html).not.toContain("Continue as guest");
  });

  it("keeps guest access disabled when authentication is unavailable", async () => {
    state.sessionReady = false;
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('<button disabled="">Continue as guest</button>');
  });
});
