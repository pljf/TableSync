import { describe, expect, it, vi } from "vitest";
import { createDocumentLifecycle } from "@/lib/document-lifecycle";
import { createRoomSyncController } from "@/lib/room-sync";

describe("document departure across route mounts", () => {
  it("blocks a room mounted after beforeunload, even before pagehide", () => {
    const target = new EventTarget();
    const lifecycle = createDocumentLifecycle(target);
    target.dispatchEvent(new Event("beforeunload"));
    const lateRoom = vi.fn();
    lifecycle.subscribe(lateRoom);
    expect(lateRoom).toHaveBeenLastCalledWith(false);
    expect(lifecycle.isActive()).toBe(false);
  });

  it("keeps departure state through unmounts and restores every current room on pageshow", () => {
    const target = new EventTarget();
    const lifecycle = createDocumentLifecycle(target);
    const original = vi.fn();
    const unsubscribe = lifecycle.subscribe(original);
    target.dispatchEvent(new Event("beforeunload"));
    unsubscribe();
    const replacement = vi.fn();
    lifecycle.subscribe(replacement);
    target.dispatchEvent(new Event("pagehide"));
    target.dispatchEvent(new Event("pageshow"));
    expect(original).toHaveBeenLastCalledWith(false);
    expect(replacement).toHaveBeenLastCalledWith(true);
    expect(lifecycle.isActive()).toBe(true);
  });

  it("does not prompt or cancel navigation", () => {
    const target = new EventTarget();
    createDocumentLifecycle(target);
    const departure = new Event("beforeunload", { cancelable: true });
    expect(target.dispatchEvent(departure)).toBe(true);
    expect(departure.defaultPrevented).toBe(false);
  });

  it("prevents the late controller's initial HTTP request and resumes after return", async () => {
    const target = new EventTarget();
    const lifecycle = createDocumentLifecycle(target);
    const readRevision = vi.fn().mockResolvedValue("initial");
    target.dispatchEvent(new Event("beforeunload"));
    const controller = createRoomSyncController({
      initialRevision: "initial", readRevision, refresh: vi.fn(), onStatus: vi.fn(),
      isVisible: () => true, isOnline: () => true, canRefresh: () => true
    });
    const unsubscribe = lifecycle.subscribe((active) => active ? controller.showPage() : controller.hidePage());
    controller.start();
    expect(readRevision).not.toHaveBeenCalled();
    target.dispatchEvent(new Event("pageshow"));
    await Promise.resolve();
    expect(readRevision).toHaveBeenCalledTimes(1);
    unsubscribe();
    controller.stop();
  });
});
