import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: vi.fn(), ready: false }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: state.user }));
vi.mock("@/lib/auth-environment", () => ({ authEnvironment: { get productionReady() { return state.ready; }, sessionReady: true } }));
vi.mock("@/components/brand/table-scene", () => ({ TableScene: () => null }));
vi.mock("@/components/auth/github-sign-in-button", () => ({ GitHubSignInButton: ({ enabled, upgrade }: { enabled: boolean; upgrade?: boolean }) => createElement("button", { disabled: !enabled }, upgrade ? "Save my rooms with GitHub" : "Continue with GitHub") }));
vi.mock("@/components/auth/guest-sign-in-button", () => ({ GuestSignInButton: () => createElement("button", null, "Continue as guest") }));
import AuthPage from "@/app/auth/page";

async function markup(query: { upgrade?: string; error?: string } = {}) {
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
    expect(html).toContain("Rooms expire 7 days after creation and are automatically deleted.");
  });
  it("keeps the account-saving retry page open after a provider error", async () => {
    const html = await markup({ upgrade: "1", error: "provider" });
    expect(html).toContain("Saving your account was not completed");
    expect(html).toContain("Save my rooms with GitHub");
  });
  it("keeps the existing normal signed-in redirect and does not re-upgrade permanent accounts", async () => {
    await expect(markup()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    state.user.mockResolvedValue({ id: "saved-host", isAnonymous: false });
    await expect(markup({ upgrade: "1" })).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });
});
