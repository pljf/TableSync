import { describe, expect, it, vi } from "vitest";
import { createDocumentLifecycle } from "@/lib/document-lifecycle";
import { createRoomSyncController } from "@/lib/room-sync";

const safariUserAgent = "Mozilla/5.0 AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15";

describe("document departure across route mounts", () => {
  it("blocks a room mounted after beforeunload, even before pagehide", () => {
    const target = new EventTarget();
    const lifecycle = createDocumentLifecycle(target, safariUserAgent);
    target.dispatchEvent(new Event("beforeunload"));
    const lateRoom = vi.fn();
    lifecycle.subscribe(lateRoom);
    expect(lateRoom).toHaveBeenLastCalledWith(false);
    expect(lifecycle.isActive()).toBe(false);
  });

  it("keeps departure state through unmounts and restores every current room on pageshow", () => {
    const target = new EventTarget();
    const lifecycle = createDocumentLifecycle(target, safariUserAgent);
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
    createDocumentLifecycle(target, safariUserAgent);
    const departure = new Event("beforeunload", { cancelable: true });
    expect(target.dispatchEvent(departure)).toBe(true);
    expect(departure.defaultPrevented).toBe(false);
  });

  it("prevents the late controller's initial HTTP request and resumes after return", async () => {
    const target = new EventTarget();
    const lifecycle = createDocumentLifecycle(target, safariUserAgent);
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

  it.each([
    ["Safari", safariUserAgent, true],
    ["iOS Firefox", "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FxiOS/140.0 Mobile/15E148 Safari/605.1.15", true],
    ["Chromium", "Mozilla/5.0 AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36", false],
    ["Firefox", "Mozilla/5.0 Gecko/20100101 Firefox/140.0", false]
  ])("uses the early departure workaround only where needed in %s", (_browser, userAgent, earlyDeparture) => {
    const target = new EventTarget();
    const listen = vi.spyOn(target, "addEventListener");
    const lifecycle = createDocumentLifecycle(target, userAgent);
    expect(listen.mock.calls.some(([type]) => type === "beforeunload")).toBe(earlyDeparture);
    target.dispatchEvent(new Event("beforeunload"));
    expect(lifecycle.isActive()).toBe(!earlyDeparture);
    target.dispatchEvent(new Event("pagehide"));
    expect(lifecycle.isActive()).toBe(false);
    target.dispatchEvent(new Event("pageshow"));
    expect(lifecycle.isActive()).toBe(true);
  });
});
