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
    const html = renderToStaticMarkup(await NewRoomPage());
    const nameInput = html.match(/<input\b[^>]*\bname="name"[^>]*>/)?.[0];

    expect(html).toContain("Your meal preferences");
    expect(nameInput).toContain('required=""');
    expect(nameInput).toContain('value="Maya Chen"');
    expect(html).toContain('value="maya@example.com"');
    expect(html).toContain('name="dietType"');
    expect(html).toContain('name="allergies"');
    expect(html).toContain("Include yourself in the guest count.");
    expect(html).toContain('aria-describedby="expected-guests-help"');
    expect(html.match(/<form>/g)).toHaveLength(1);
  });

  it("asks anonymous creators for their own name without exposing generated account details", async () => {
    mocks.host.mockResolvedValue({ id: "anonymous-host", name: "Guest host", email: "generated@guest.tablesync.invalid", isAnonymous: true });
    const html = renderToStaticMarkup(await NewRoomPage());
    const nameInput = html.match(/<input\b[^>]*\bname="name"[^>]*>/)?.[0];

    expect(nameInput).toContain('required=""');
    expect(nameInput).not.toContain("value=");
    expect(html).not.toContain("generated@guest.tablesync.invalid");
  });
});
