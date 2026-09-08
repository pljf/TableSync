export type RoomSyncStatus = "connected" | "offline" | "retrying" | "unavailable";

export class RoomSyncAccessError extends Error {}

type RoomSyncOptions = {
  readRevision: (signal: AbortSignal) => Promise<string>;
  refresh: () => void;
  canRefresh: () => boolean;
  isVisible: () => boolean;
  isOnline: () => boolean;
  onStatus: (status: RoomSyncStatus) => void;
  initialRevision?: string;
  intervalMs?: number;
};

export function createRoomSyncController(options: RoomSyncOptions) {
  const intervalMs = options.intervalMs ?? 8_000;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  let appliedRevision = options.initialRevision;
  let latestRevision = options.initialRevision;
  let wakeAfterRequest = false;
  let failures = 0;
  let status: RoomSyncStatus = "connected";

  function setStatus(next: RoomSyncStatus) {
    status = next;
    options.onStatus(next);
  }

  function flush() {
    if (stopped || !options.isVisible() || !options.isOnline() || !options.canRefresh()) return;
    if (latestRevision !== undefined && latestRevision !== appliedRevision) {
      appliedRevision = latestRevision;
      options.refresh();
    }
  }

  function schedule() {
    clearTimeout(timer);
    if (stopped || !options.isVisible() || !options.isOnline() || status === "unavailable") return;
    timer = setTimeout(check, intervalMs * Math.min(2 ** failures, 4));
  }

  async function check() {
    clearTimeout(timer);
    if (stopped || !options.isVisible()) return;
    if (!options.isOnline()) {
      setStatus("offline");
      return;
    }
    if (request) return;

    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const revision = await options.readRevision(controller.signal);
      if (stopped || controller.signal.aborted) return;
      failures = 0;
      setStatus("connected");
      // Server-rendered pages provide a revision read before their content, so
      // changes during rendering/hydration are already visible on this check.
      if (appliedRevision === undefined) appliedRevision = revision;
      latestRevision = revision;
      flush();
    } catch (error) {
      if (!stopped && options.isVisible() && controller.signal.reason !== "paused") {
        failures += 1;
        setStatus(!options.isOnline() ? "offline" : error instanceof RoomSyncAccessError ? "unavailable" : "retrying");
      }
    } finally {
      clearTimeout(timeout);
      request = undefined;
      if (wakeAfterRequest && !stopped) {
        wakeAfterRequest = false;
        void check();
      } else schedule();
    }
  }

  function resume() {
    if (stopped) return;
    if (!options.isVisible() || !options.isOnline()) {
      clearTimeout(timer);
      request?.abort("paused");
      if (!options.isOnline()) setStatus("offline");
      return;
    }
    if (request?.signal.aborted) wakeAfterRequest = true;
    flush();
    void check();
  }

  return {
    start: resume,
    resume,
    flush,
    stop() {
      stopped = true;
      clearTimeout(timer);
      request?.abort();
    }
  };
}
