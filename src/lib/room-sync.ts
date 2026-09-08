export type RoomSyncStatus = "connected" | "waiting" | "offline" | "retrying" | "unavailable";

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
  let pageActive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  let appliedRevision = options.initialRevision;
  let latestRevision = options.initialRevision;
  let requestedRevision: string | undefined;
  let renderEpoch = 0;
  let refreshFailures = 0;
  let retryRefreshAt = 0;
  let wakeAfterRequest = false;
  let failures = 0;
  let status: RoomSyncStatus = "connected";

  function setStatus(next: RoomSyncStatus) {
    status = next;
    options.onStatus(next);
  }

  function flush() {
    if (stopped || !pageActive || !options.isVisible() || !options.isOnline() || status === "unavailable") return;
    if (latestRevision !== undefined && latestRevision !== appliedRevision) {
      if (requestedRevision !== undefined) return;
      if (!options.canRefresh()) {
        if (status === "connected" || status === "waiting") setStatus("waiting");
        return;
      }
      if (Date.now() < retryRefreshAt) return;
      requestedRevision = latestRevision;
      setStatus("connected");
      try {
        options.refresh();
      } catch {
        acknowledge(appliedRevision);
      }
    } else if (status === "waiting") {
      setStatus("connected");
    }
  }

  // A request is not a rendered update. Only the revision supplied by the
  // committed server content may advance the applied baseline.
  function acknowledge(revision: string | undefined) {
    if (stopped) return;
    if (revision !== undefined && revision !== appliedRevision) {
      appliedRevision = revision;
      latestRevision = revision;
      requestedRevision = undefined;
      refreshFailures = 0;
      retryRefreshAt = 0;
      // Ignore a revision fetch begun before this render: it may describe an
      // older snapshot and must not trigger a refresh back to stale content.
      renderEpoch += 1;
      setStatus("connected");
    } else if (requestedRevision !== undefined) {
      requestedRevision = undefined;
      refreshFailures += 1;
      retryRefreshAt = Date.now() + intervalMs * Math.min(2 ** refreshFailures, 4);
      setStatus("retrying");
      schedule();
    }
  }

  function schedule() {
    clearTimeout(timer);
    if (stopped || !pageActive || !options.isVisible() || !options.isOnline() || status === "unavailable") return;
    timer = setTimeout(check, intervalMs * Math.min(2 ** failures, 4));
  }

  async function check() {
    clearTimeout(timer);
    if (stopped || !pageActive || !options.isVisible()) return;
    if (!options.isOnline()) {
      setStatus("offline");
      return;
    }
    if (request) return;

    const controller = new AbortController();
    const startedEpoch = renderEpoch;
    request = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const revision = await options.readRevision(controller.signal);
      if (stopped || controller.signal.aborted || startedEpoch !== renderEpoch) return;
      failures = 0;
      // Server-rendered pages provide a revision read before their content, so
      // changes during rendering/hydration are already visible on this check.
      if (appliedRevision === undefined) appliedRevision = revision;
      latestRevision = revision;
      if (revision === appliedRevision && requestedRevision === undefined) {
        refreshFailures = 0;
        retryRefreshAt = 0;
      }
      setStatus(refreshFailures > 0 ? "retrying" : "connected");
      flush();
    } catch (error) {
      if (!stopped && pageActive && options.isVisible() && controller.signal.reason !== "paused") {
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
    if (!pageActive || !options.isVisible() || !options.isOnline()) {
      clearTimeout(timer);
      request?.abort("paused");
      if (!options.isOnline()) setStatus("offline");
      return;
    }
    if (request?.signal.aborted) wakeAfterRequest = true;
    retryRefreshAt = 0;
    flush();
    void check();
  }

  return {
    start: resume,
    resume,
    flush,
    acknowledge,
    hidePage() {
      // Full-document navigation can begin before visibilitychange or React
      // unmount. Do not start work against that document's departing loader.
      pageActive = false;
      resume();
    },
    showPage() {
      pageActive = true;
      resume();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      request?.abort();
    }
  };
}
