import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: vi.fn(), ready: false }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: state.user }));
vi.mock("@/lib/auth-environment", () => ({ authEnvironment: { get productionReady() { return state.ready; }, sessionReady: true } }));
vi.mock("@/components/brand/table-scene", () => ({ TableScene: () => null }));
vi.mock("@/components/auth/github-sign-in-button", () => ({ GitHubSignInButton: ({ enabled, upgrade, destination, errorDestination }: { enabled: boolean; upgrade?: boolean; destination?: string; errorDestination?: string }) => createElement("button", { disabled: !enabled, "data-destination": destination, "data-error-destination": errorDestination }, upgrade ? "Save my rooms with GitHub" : "Continue with GitHub") }));
vi.mock("@/components/auth/guest-sign-in-button", () => ({ GuestSignInButton: ({ destination }: { destination?: string }) => createElement("button", { "data-destination": destination }, "Continue as guest") }));
import AuthPage from "@/app/auth/page";

async function markup(query: { upgrade?: string; error?: string; create?: string | string[]; eventType?: string | string[] } = {}) {
  return renderToStaticMarkup(await AuthPage({ searchParams: Promise.resolve(query) }) as ReactNode);
}

describe("save hosted rooms without ending the guest session", () => {
  beforeEach(() => { vi.clearAllMocks(); state.ready = false; state.user.mockResolvedValue({ id: "guest-host", isAnonymous: true }); });
  it("offers an honest unavailable state while keeping a return path to existing rooms", async () => {
    const html = await markup({ upgrade: "1" });
    expect(html).toContain("Save my rooms with GitHub");
    expect(html).toContain("button disabled");
    expect(html).toContain("Account saving is not set up in this installation yet");
    expect(html).toContain('href="/dashboard"');
    expect(html).not.toContain("Continue as guest");
  });
  it("offers account saving for an existing anonymous host when the provider is ready", async () => {
    state.ready = true;
    const html = await markup({ upgrade: "1" });
    expect(html).toContain("Save my rooms with GitHub");
    expect(html).not.toContain("button disabled");
    expect(html).toContain("does not transfer guest responses to another device");
    expect(html).toContain("or extend room lifetimes");
    expect(html).toContain("Rooms stay available for at least 7 days after creation or until 3 days after the gathering, whichever is later, then are automatically deleted.");
  });
  it("keeps the account-saving retry page open after a provider error", async () => {
    const html = await markup({ upgrade: "1", error: "provider" });
    expect(html).toContain("Saving your account was not completed");
    expect(html).toContain("Save my rooms with GitHub");
  });
  it("returns an existing host to their chosen gathering instead of the dashboard", async () => {
    await expect(markup({ create: "1", eventType: "BRUNCH" })).rejects.toMatchObject({
      digest: expect.stringContaining("/rooms/new?eventType=BRUNCH")
    });
  });
  it("passes creation and retry destinations to both sign-in controls", async () => {
    state.user.mockResolvedValue(null);
    const html = await markup({ create: "1", eventType: "BBQ", error: "provider" });
    expect(html.match(/data-destination="\/rooms\/new\?eventType=BBQ"/g)).toHaveLength(2);
    expect(html).toContain('data-error-destination="/auth?create=1&amp;eventType=BBQ&amp;error=provider"');
    expect(html).toContain("Sign-in was not completed");
  });
  it("keeps the existing normal signed-in redirect and does not re-upgrade permanent accounts", async () => {
    await expect(markup()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    state.user.mockResolvedValue({ id: "saved-host", isAnonymous: false });
    await expect(markup({ upgrade: "1" })).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });
});
