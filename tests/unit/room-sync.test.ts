import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoomSyncController, RoomSyncAccessError } from "@/lib/room-sync";

function fixture(initialRevision?: string) {
  const state = { visible: true, online: true, canRefresh: true };
  const readRevision = vi.fn<(signal: AbortSignal) => Promise<string>>().mockResolvedValue("first");
  const refresh = vi.fn();
  const onStatus = vi.fn();
  const sync = createRoomSyncController({
    readRevision, refresh, onStatus, initialRevision,
    isVisible: () => state.visible, isOnline: () => state.online, canRefresh: () => state.canRefresh
  });
  return { state, readRevision, refresh, onStatus, sync };
}

describe("room update polling", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  it("catches updates between the server snapshot and the first client request", async () => {
    const { sync, refresh } = fixture("server revision");
    sync.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    sync.stop();
  });

  it("polls every eight seconds and refreshes only when the revision changes", async () => {
    const { sync, readRevision, refresh } = fixture();
    sync.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(8_000);
    expect(readRevision).toHaveBeenCalledTimes(2);
    expect(refresh).not.toHaveBeenCalled();
    readRevision.mockResolvedValue("second");
    await vi.advanceTimersByTimeAsync(8_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    sync.stop();
  });

  it("keeps a missed change while editing or saving and applies it when safe", async () => {
    const { sync, state, readRevision, refresh } = fixture();
    sync.start();
    await vi.advanceTimersByTimeAsync(0);
    state.canRefresh = false;
    readRevision.mockResolvedValue("second");
    await vi.advanceTimersByTimeAsync(8_000);
    readRevision.mockResolvedValue("third");
    await vi.advanceTimersByTimeAsync(8_000);
    expect(refresh).not.toHaveBeenCalled();
    state.canRefresh = true;
    sync.flush();
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    sync.stop();
  });

  it("suspends hidden polling and checks missed changes immediately on return", async () => {
    const { sync, state, readRevision, refresh } = fixture();
    sync.start();
    await vi.advanceTimersByTimeAsync(0);
    state.visible = false;
    sync.resume();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(readRevision).toHaveBeenCalledTimes(1);
    readRevision.mockResolvedValue("second");
    state.visible = true;
    sync.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    sync.stop();
  });

  it("reports offline status without requests and resumes automatically online", async () => {
    const { sync, state, readRevision, onStatus } = fixture();
    state.online = false;
    sync.start();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(readRevision).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenLastCalledWith("offline");
    state.online = true;
    sync.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(readRevision).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenLastCalledWith("connected");
    sync.stop();
  });

  it("does not overlap requests triggered by focus or the polling timer", async () => {
    const { sync, readRevision } = fixture();
    let resolve!: (revision: string) => void;
    readRevision.mockImplementation(() => new Promise((done) => { resolve = done; }));
    sync.start();
    sync.resume();
    sync.resume();
    await vi.advanceTimersByTimeAsync(8_000);
    expect(readRevision).toHaveBeenCalledTimes(1);
    resolve("first");
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(readRevision).toHaveBeenCalledTimes(2);
    sync.stop();
  });

  it("retries temporary failures with backoff and allows an immediate manual retry", async () => {
    const { sync, readRevision, onStatus } = fixture();
    readRevision.mockRejectedValueOnce(new Error("Connection failed"));
    sync.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenLastCalledWith("retrying");
    await vi.advanceTimersByTimeAsync(8_000);
    expect(readRevision).toHaveBeenCalledTimes(1);
    sync.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(readRevision).toHaveBeenCalledTimes(2);
    expect(onStatus).toHaveBeenLastCalledWith("connected");
    sync.stop();
  });

  it("aborts a stalled request and retries without creating overlapping fetches", async () => {
    const { sync, readRevision, onStatus } = fixture();
    readRevision.mockImplementationOnce((signal) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
    }));
    sync.start();
    await vi.advanceTimersByTimeAsync(12_000);
    expect(readRevision.mock.calls[0][0].aborted).toBe(true);
    expect(onStatus).toHaveBeenLastCalledWith("retrying");
    await vi.advanceTimersByTimeAsync(16_000);
    expect(readRevision).toHaveBeenCalledTimes(2);
    expect(onStatus).toHaveBeenLastCalledWith("connected");
    sync.stop();
  });

  it("checks immediately after a quick tab return while an aborted request is settling", async () => {
    const { sync, state, readRevision, refresh, onStatus } = fixture("initial");
    readRevision.mockImplementationOnce((signal) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
    }));
    sync.start();
    state.visible = false;
    sync.resume();
    state.visible = true;
    sync.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(readRevision).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onStatus).not.toHaveBeenCalledWith("retrying");
    sync.stop();
  });

  it("stops automatic retry when room access is unavailable", async () => {
    const { sync, readRevision, onStatus } = fixture();
    readRevision.mockRejectedValue(new RoomSyncAccessError());
    sync.start();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(readRevision).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenLastCalledWith("unavailable");
    sync.stop();
  });

  it("aborts requests on cleanup and never refreshes after unmounting", async () => {
    const { sync, readRevision, refresh } = fixture();
    let resolve!: (revision: string) => void;
    readRevision.mockImplementation(() => new Promise((done) => { resolve = done; }));
    sync.start();
    const signal = readRevision.mock.calls[0][0];
    sync.stop();
    expect(signal.aborted).toBe(true);
    resolve("new revision");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).not.toHaveBeenCalled();
    expect(readRevision).toHaveBeenCalledTimes(1);
  });
});
