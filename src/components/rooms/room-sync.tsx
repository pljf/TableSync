"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRoomSyncController, RoomSyncAccessError, type RoomSyncStatus } from "@/lib/room-sync";
import { hasUnsavedFormControls } from "@/lib/form-drafts";

export function RoomSync({ roomId, initialRevision }: { roomId: string; initialRevision?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<RoomSyncStatus>("connected");
  const [refreshing, startTransition] = useTransition();
  const refreshPending = useRef(false);
  const renderedRevision = useRef(initialRevision);
  const sync = useRef<ReturnType<typeof createRoomSyncController> | null>(null);
  const draftState = useRef({
    dirtyForms: new Map<HTMLFormElement, number>(),
    submittedForms: new Map<HTMLFormElement, { pending: boolean; version: number }>(),
    editVersion: 0
  });

  useEffect(() => {
    renderedRevision.current = initialRevision;
    refreshPending.current = refreshing;
    if (!refreshing) sync.current?.acknowledge(initialRevision);
  }, [initialRevision, refreshing]);

  useEffect(() => {
    const drafts = draftState.current;
    const { dirtyForms, submittedForms } = drafts;
    const editingSelector = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, select, [contenteditable="true"]';

    function reconcileForms() {
      for (const form of document.querySelectorAll<HTMLFormElement>('form[data-state="pending"]')) {
        const submission = submittedForms.get(form);
        submittedForms.set(form, { pending: true, version: submission?.version ?? dirtyForms.get(form) ?? 0 });
      }
      for (const [form, submission] of submittedForms) {
        const state = form.dataset.state;
        if (!form.isConnected || (submission.pending && state !== "pending") || state === "error") {
          submittedForms.delete(form);
          if (!form.isConnected || (state === "success" && (dirtyForms.get(form) ?? 0) <= submission.version)) dirtyForms.delete(form);
        }
      }
      for (const form of dirtyForms.keys()) {
        if (!form.isConnected || !hasUnsavedFormControls(form.elements)) {
          dirtyForms.delete(form);
        }
      }
    }

    const controller = createRoomSyncController({
      initialRevision: renderedRevision.current,
      async readRevision(signal) {
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/revision`, { cache: "no-store", credentials: "same-origin", signal });
        if (response.status === 401 || response.status === 403 || response.status === 404) throw new RoomSyncAccessError();
        if (!response.ok) throw new Error("Room revision unavailable");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("revision" in data) || typeof data.revision !== "string" || !/^[a-f0-9]{64}$/.test(data.revision)) {
          throw new Error("Invalid room revision");
        }
        return data.revision;
      },
      refresh() {
        refreshPending.current = true;
        startTransition(() => router.refresh());
      },
      canRefresh() {
        reconcileForms();
        return !refreshPending.current && dirtyForms.size === 0 && submittedForms.size === 0 &&
          !document.activeElement?.matches(editingSelector) &&
          !document.querySelector('form[data-state="pending"], form[aria-busy="true"], form [aria-busy="true"], [data-dirty="true"]');
      },
      isVisible: () => document.visibilityState === "visible",
      isOnline: () => navigator.onLine,
      onStatus: setStatus
    });
    sync.current = controller;

    function onEdit(event: Event) {
      const form = event.target instanceof HTMLElement ? event.target.closest("form") : null;
      if (form) dirtyForms.set(form, ++drafts.editVersion);
    }
    function onSubmit(event: Event) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;
      submittedForms.set(form, { pending: false, version: dirtyForms.get(form) ?? 0 });
      // Run after form validation handlers have had a chance to cancel.
      queueMicrotask(() => {
        if (event.defaultPrevented && form.dataset.state !== "pending") submittedForms.delete(form);
      });
    }
    function onReset(event: Event) {
      if (event.target instanceof HTMLFormElement) dirtyForms.delete(event.target);
      queueMicrotask(controller.flush);
    }
    function onFocusOut() { queueMicrotask(controller.flush); }
    const observer = new MutationObserver(() => {
      reconcileForms();
      controller.flush();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-state", "aria-busy", "data-dirty"], childList: true, subtree: true });
    document.addEventListener("visibilitychange", controller.resume);
    window.addEventListener("focus", controller.resume);
    window.addEventListener("online", controller.resume);
    window.addEventListener("offline", controller.resume);
    window.addEventListener("pagehide", controller.hidePage);
    window.addEventListener("pageshow", controller.showPage);
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("reset", onReset, true);
    document.addEventListener("focusout", onFocusOut);
    controller.start();

    return () => {
      controller.stop();
      sync.current = null;
      observer.disconnect();
      document.removeEventListener("visibilitychange", controller.resume);
      window.removeEventListener("focus", controller.resume);
      window.removeEventListener("online", controller.resume);
      window.removeEventListener("offline", controller.resume);
      window.removeEventListener("pagehide", controller.hidePage);
      window.removeEventListener("pageshow", controller.showPage);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("reset", onReset, true);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [roomId, router]);

  if (status === "connected") return null;
  return (
    <div className="button-row" style={{ alignItems: "center", flexBasis: "100%" }}>
      <span aria-live="polite" aria-atomic="true" className="muted" role="status" style={{ fontSize: "0.8rem" }}>
        {status === "waiting" ? "Updates are waiting. Finish your changes to see them." : status === "offline" ? "You’re offline. Room updates will resume when you reconnect." : status === "unavailable" ? "Room updates are unavailable. Retry to check your access." : "Room updates are paused. Retrying automatically…"}
      </span>
      {status !== "offline" && status !== "waiting" ? <button className="button secondary small" onClick={() => sync.current?.resume()} type="button">Retry updates</button> : null}
    </div>
  );
}
