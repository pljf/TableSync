import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoomProgress } from "@/components/rooms/room-progress";
import type { RoomStatus } from "@/lib/domain";

function renderProgress(status: RoomStatus, guestCount = 2, expectedGuests?: number) {
  return renderToStaticMarkup(createElement(RoomProgress, { status, guestCount, expectedGuests }));
}

describe("room workflow progress", () => {
  it.each([
    ["DRAFT", "Preferences", 0],
    ["COLLECTING_PREFERENCES", "Preferences", 0],
    ["PLANNING", "Menu &amp; voting", 1],
    ["VOTING", "Menu &amp; voting", 1],
    ["FINALIZED", "Shopping", 2]
  ] as const)("marks the workflow stage for %s independently of page navigation", (status, label, completed) => {
    const html = renderProgress(status);
    const current = html.match(/<li aria-current="step"[^>]*>(.*?)<\/li>/)?.[1];

    expect(html).toContain('aria-label="Room progress"');
    expect(html).toContain('<ol');
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(current).toContain(`<strong>${label}</strong>`);
    expect(current).toContain("Current step");
    expect(html.match(/>Completed</g) ?? []).toHaveLength(completed);
    expect(html.match(/>Up next</g) ?? []).toHaveLength(2 - completed);
    expect(html).not.toContain('aria-current="page"');
    expect(html).not.toContain("<a ");
  });

  it("does not invent a current or completed stage for archived rooms", () => {
    const html = renderProgress("ARCHIVED");

    expect(html).toContain("Archived room · no active step");
    expect(html.match(/>Inactive</g)).toHaveLength(3);
    expect(html).not.toContain("aria-current");
    expect(html).not.toContain("Completed");
  });

  it("shows how many guests shared preferences without treating attendance as a requirement", () => {
    const html = renderProgress("COLLECTING_PREFERENCES", 0, 6);

    expect(html).toContain("0 of 6 guests have shared preferences");
    expect(html).not.toContain("required");
    expect(html).not.toContain("remaining");
    expect(renderProgress("PLANNING", 2, 6)).toContain("2 of 6 guests have shared preferences");
  });

  it("keeps the total truthful when more guests join than expected", () => {
    expect(renderProgress("COLLECTING_PREFERENCES", 8, 6)).toContain("8 of 8 guests have shared preferences");
  });

  it("uses a simple response count when the expected attendance is unknown", () => {
    expect(renderProgress("DRAFT", 0)).toContain("0 guests have shared preferences");
    expect(renderProgress("COLLECTING_PREFERENCES", 1)).toContain("1 guest has shared preferences");
    expect(renderProgress("COLLECTING_PREFERENCES", 2)).toContain("2 guests have shared preferences");
  });
});
