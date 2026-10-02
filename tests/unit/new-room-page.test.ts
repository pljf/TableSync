import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ host: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireHost: mocks.host }));
vi.mock("@/app/actions", () => ({ createRoomAction: vi.fn() }));
vi.mock("@/components/ui/mutation-form", () => ({ MutationForm: ({ children }: { children: ReactNode }) => createElement("form", null, children) }));

import NewRoomPage from "@/app/rooms/new/page";

describe("room creator meal preferences", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("collects the creator's response with room details and prefills a saved account", async () => {
    mocks.host.mockResolvedValue({ id: "host-1", name: "Maya Chen", email: "maya@example.com", isAnonymous: false });
    const html = renderToStaticMarkup(await NewRoomPage({}));
    const nameInput = html.match(/<input\b[^>]*\bname="name"[^>]*>/)?.[0];

    expect(html).toContain("Your meal preferences");
    expect(nameInput).toContain('required=""');
    expect(nameInput).toContain('value="Maya Chen"');
    expect(html).toContain('value="maya@example.com"');
    expect(html).toContain('name="dietType"');
    expect(html).toContain('name="allergies"');
    expect(html).toContain("Include yourself in the guest count.");
    expect(html).toContain("Rooms stay available for at least 7 days after creation or until 3 days after the gathering, whichever is later, then are automatically deleted.");
    expect(html).toContain('aria-describedby="expected-guests-help"');
    expect(html.match(/<form>/g)).toHaveLength(1);
  });

  it("keeps every required control outside the optional disclosures", async () => {
    mocks.host.mockResolvedValue({ id: "host-1", name: "Maya", email: "maya@example.com", isAnonymous: false });
    const html = renderToStaticMarkup(await NewRoomPage({}));
    const optionalSections = [...html.matchAll(/<details\b[^>]*data-optional-section[^>]*>([\s\S]*?)<\/details>/g)];
    expect(optionalSections).toHaveLength(2);
    for (const section of optionalSections) {
      expect(section[0]).not.toContain("required=");
      expect(section[0]).not.toMatch(/<details[^>]*\bopen/);
    }
    expect(html.match(/name="name"/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html).toContain('name="allergies"');
  });

  it.each(["BRUNCH", "BBQ", "POTLUCK"])("prefills %s and carries its sign-in intent", async (eventType) => {
    mocks.host.mockResolvedValue({ id: "host-1", name: "Maya", isAnonymous: false });
    const html = renderToStaticMarkup(await NewRoomPage({ searchParams: Promise.resolve({ eventType }) }));
    expect(html).toContain('value="' + eventType + '" selected=""');
    expect(mocks.host).toHaveBeenCalledWith("/auth?create=1&eventType=" + eventType);
  });

  it.each(["brunch", "//attacker.invalid", ["BRUNCH", "BBQ"]])("falls back for invalid or duplicated occasion %j", async (eventType) => {
    mocks.host.mockResolvedValue({ id: "host-1", name: "Maya", isAnonymous: false });
    const html = renderToStaticMarkup(await NewRoomPage({ searchParams: Promise.resolve({ eventType }) }));
    expect(html).toContain('value="DINNER" selected=""');
    expect(mocks.host).toHaveBeenCalledWith("/auth?create=1");
  });

  it("asks anonymous creators for their own name without exposing generated account details", async () => {
    mocks.host.mockResolvedValue({ id: "anonymous-host", name: "Guest host", email: "generated@guest.tablesync.invalid", isAnonymous: true });
    const html = renderToStaticMarkup(await NewRoomPage({}));
    const nameInput = html.match(/<input\b[^>]*\bname="name"[^>]*>/)?.[0];

    expect(nameInput).toContain('required=""');
    expect(nameInput).not.toContain("value=");
    expect(html).not.toContain("generated@guest.tablesync.invalid");
  });
});
