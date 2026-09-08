import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions", () => ({ castVoteAction: vi.fn() }));

import { syncVoteReasonDraft } from "@/components/menu/vote-form";

describe("vote reason refreshes", () => {
  it("adopts another tab's saved reason when this input is untouched", () => {
    const refreshed = syncVoteReasonDraft({ saved: "Too spicy", value: "Too spicy" }, "Please keep sauce separate");
    expect(refreshed).toEqual({ saved: "Please keep sauce separate", value: "Please keep sauce separate" });
    expect(refreshed.value === refreshed.saved).toBe(true);
    expect(syncVoteReasonDraft(refreshed, "No chili, please")).toEqual({ saved: "No chili, please", value: "No chili, please" });
  });

  it("clears an untouched reason when the external vote no longer has one", () => {
    expect(syncVoteReasonDraft({ saved: "Too spicy", value: "Too spicy" }, "")).toEqual({ saved: "", value: "" });
  });

  it("retains a local draft through successive external changes", () => {
    const first = syncVoteReasonDraft({ saved: "Too spicy", value: "Keep my unfinished note" }, "External note");
    const next = syncVoteReasonDraft(first, "Another external note");
    expect(next).toEqual({ saved: "Another external note", value: "Keep my unfinished note" });
    expect(next.value === next.saved).toBe(false);
  });

  it("adopts updates again after the user returns to the latest saved value", () => {
    const edited = syncVoteReasonDraft({ saved: "Original", value: "Draft" }, "External");
    const reverted = { ...edited, value: "External" };
    expect(syncVoteReasonDraft(reverted, "Latest")).toEqual({ saved: "Latest", value: "Latest" });
  });

  it("makes a confirmed submission clean when its saved props arrive", () => {
    expect(syncVoteReasonDraft({ saved: "Original", value: "Confirmed note" }, "Confirmed note")).toEqual({ saved: "Confirmed note", value: "Confirmed note" });
  });

  it("preserves edits made while a successful submission is refreshing", () => {
    expect(syncVoteReasonDraft({ saved: "Original", value: "Still editing" }, "Confirmed note")).toEqual({ saved: "Confirmed note", value: "Still editing" });
  });

  it("leaves the draft intact when the saved reason is unchanged", () => {
    const draft = { saved: "Original", value: "Unsent note" };
    expect(syncVoteReasonDraft(draft, "Original")).toBe(draft);
  });
});
