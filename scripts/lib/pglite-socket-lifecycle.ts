import type { PGLiteSocketHandler } from "@electric-sql/pglite-socket";

const patchKey = Symbol.for("tablesync.pglite-socket-lifecycle.0.1.3");

/**
 * pglite-socket 0.1.3 detaches errored sockets without a close event. Its server
 * then retains a phantom connection until maxConnections is exhausted.
 * Keep upstream transaction cleanup and error reporting; supply the missing
 * lifecycle notification only after detach succeeds. No dependency files change.
 * Remove/review this compatibility fix when upgrading the pinned local runtime.
 */
export function installPgliteSocketLifecycleFix(
  Handler: typeof PGLiteSocketHandler,
  version: string,
) {
  if (version !== "0.1.3") {
    throw new Error(`Review the local database lifecycle fix for pglite-socket ${version}.`);
  }

  const prototype = Handler.prototype;
  if (Object.hasOwn(prototype, patchKey)) return;

  const originalAttach = prototype.attach;
  const originalDetach = prototype.detach;
  const originalDispatch = prototype.dispatchEvent;
  const lifecycles = new WeakMap<PGLiteSocketHandler, {
    closed: boolean;
    detaching?: Promise<PGLiteSocketHandler>;
  }>();

  prototype.attach = function (socket) {
    if (!this.isAttached) lifecycles.set(this, { closed: false });
    return originalAttach.call(this, socket);
  };

  prototype.dispatchEvent = function (event) {
    const lifecycle = lifecycles.get(this);
    if (event.type === "close" && lifecycle) {
      // Native error/close callbacks can both be queued before detach runs.
      if (lifecycle.closed) return true;
      lifecycle.closed = true;
    }
    return originalDispatch.call(this, event);
  };

  prototype.detach = function (close) {
    const lifecycle = lifecycles.get(this);
    if (!lifecycle) return originalDetach.call(this, close);
    if (lifecycle.detaching) return lifecycle.detaching;
    if (!this.isAttached) return Promise.resolve(this);

    lifecycle.detaching = originalDetach.call(this, close).then((handler) => {
      if (!handler.isAttached) handler.dispatchEvent(new Event("close"));
      return handler;
    }).finally(() => {
      lifecycle.detaching = undefined;
    });
    return lifecycle.detaching;
  };

  Object.defineProperty(prototype, patchKey, { value: true });
}
