import { EventEmitter } from "node:events";
import type { Socket } from "node:net";
import { setImmediate as nextTurn } from "node:timers/promises";
import { PGLiteSocketHandler } from "@electric-sql/pglite-socket";
import { describe, expect, it, vi } from "vitest";
import { installPgliteSocketLifecycleFix } from "../../scripts/lib/pglite-socket-lifecycle";

class FakeSocket extends EventEmitter {
  writable = true;
  remoteAddress = "127.0.0.1";
  remotePort = 12345;
  setNoDelay() {}
  end() {}
  destroy() {
    this.writable = false;
    this.emit("close");
  }
}

function fixture(patched = true, rollback = async () => {}) {
  class Handler extends PGLiteSocketHandler {}
  if (patched) installPgliteSocketLifecycleFix(Handler, "0.1.3");
  const queue = {
    clearQueueForHandler: vi.fn(),
    clearTransactionIfNeeded: vi.fn(rollback),
  };
  // The public constructor types its queue as an internal class; only cleanup
  // is exercised here, so no WASM database, network or persisted state is needed.
  const handler = new Handler({
    queryQueue: queue as unknown as ConstructorParameters<typeof Handler>[0]["queryQueue"],
    closeOnDetach: true,
  });
  const socket = new FakeSocket();
  const close = vi.fn();
  const error = vi.fn();
  handler.addEventListener("close", close);
  handler.addEventListener("error", error);
  return { Handler, handler, socket, queue, close, error };
}

async function settle() {
  await nextTurn();
  await nextTurn();
}

describe("local database socket lifecycle compatibility fix", () => {
  it("reproduces the pinned upstream slot leak after ECONNRESET", async () => {
    const { handler, socket, error, close } = fixture(false);
    await handler.attach(socket as unknown as Socket);
    socket.emit("error", new Error("ECONNRESET"));
    await settle();
    expect(error).toHaveBeenCalledOnce();
    expect(handler.isAttached).toBe(false);
    expect(close).not.toHaveBeenCalled();
  });

  it("reports errors and frees the slot only after transaction cleanup", async () => {
    let release!: () => void;
    const { handler, socket, queue, close, error } = fixture(true, () => new Promise<void>((resolve) => { release = resolve; }));
    await handler.attach(socket as unknown as Socket);
    socket.emit("error", new Error("ECONNRESET"));
    await settle();
    expect(error).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    expect(handler.isAttached).toBe(true);
    release();
    await settle();
    expect(queue.clearTransactionIfNeeded).toHaveBeenCalledOnce();
    expect(handler.isAttached).toBe(false);
    expect(close).toHaveBeenCalledOnce();
  });

  it("is idempotent for installation, racing error/close and repeated detach", async () => {
    const { Handler, handler, socket, queue, close } = fixture();
    const detach = Handler.prototype.detach;
    installPgliteSocketLifecycleFix(Handler, "0.1.3");
    expect(Handler.prototype.detach).toBe(detach);
    await handler.attach(socket as unknown as Socket);
    socket.emit("error", new Error("ECONNRESET"));
    socket.emit("close");
    await settle();
    await Promise.all([handler.detach(true), handler.detach(true)]);
    expect(queue.clearTransactionIfNeeded).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps a normal close single and supports a fresh attached lifecycle", async () => {
    const { handler, socket, close } = fixture();
    await handler.attach(socket as unknown as Socket);
    socket.emit("close");
    await settle();
    expect(close).toHaveBeenCalledOnce();
    const second = new FakeSocket();
    await handler.attach(second as unknown as Socket);
    second.emit("error", new Error("ECONNRESET"));
    await settle();
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("does not report success or a freed slot if rollback fails", async () => {
    const failure = new Error("rollback failed");
    const { handler, socket, close } = fixture(true, async () => { throw failure; });
    await handler.attach(socket as unknown as Socket);
    await expect(handler.detach(true)).rejects.toBe(failure);
    expect(close).not.toHaveBeenCalled();
    expect(handler.isAttached).toBe(true);
  });

  it("frees every connection across 150 connect/error/disconnect cycles", async () => {
    const handlers = new Set<PGLiteSocketHandler>();
    for (let cycle = 0; cycle < 150; cycle++) {
      const { handler, socket, close } = fixture();
      handlers.add(handler);
      handler.addEventListener("close", () => handlers.delete(handler));
      await handler.attach(socket as unknown as Socket);
      socket.emit("error", new Error("ECONNRESET"));
      if (cycle % 2 === 0) socket.emit("close");
      await settle();
      expect(close).toHaveBeenCalledOnce();
      expect(handlers.size).toBe(0);
    }
  });

  it("requires review instead of silently patching a changed dependency", () => {
    class Handler extends PGLiteSocketHandler {}
    expect(() => installPgliteSocketLifecycleFix(Handler, "0.2.11")).toThrow("Review");
  });
});
