/** Keep departure state across route mounts, including late passive effects. */
export function createDocumentLifecycle(target?: Pick<EventTarget, "addEventListener">) {
  let active = true;
  const listeners = new Set<(active: boolean) => void>();
  function update(next: boolean) {
    active = next;
    for (const listener of listeners) listener(active);
  }
  target?.addEventListener("beforeunload", () => update(false));
  target?.addEventListener("pagehide", () => update(false));
  target?.addEventListener("pageshow", () => update(true));
  return {
    isActive: () => active,
    subscribe(listener: (active: boolean) => void) {
      listeners.add(listener);
      listener(active);
      return () => { listeners.delete(listener); };
    }
  };
}

// Imported by the persistent main navigation as well as RoomSync, so this
// listener exists before a streamed room's passive effect can be mounted.
export const documentLifecycle = createDocumentLifecycle(typeof window === "undefined" ? undefined : window);
