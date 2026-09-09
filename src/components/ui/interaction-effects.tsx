"use client";

import { useEffect, useState } from "react";

type Ripple = {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
  radius: string;
  color: string;
  x: number;
  y: number;
  size: number;
};

const interactiveSelector = "button, a.button, a.icon-button, a.icon-text-button, .main-nav-link, .tab-nav a";
const unavailableSelector = ":disabled, [aria-disabled='true'], [data-effects='none']";

/** A decorative click response, independent of whether the requested action succeeds. */
export function InteractionEffects() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let nextId = 0;
    let keyboardPress: { element: HTMLElement; key: string } | null = null;
    const pressedControlObserver = new MutationObserver(() => {
      if (keyboardPress && (!keyboardPress.element.isConnected || keyboardPress.element.matches(unavailableSelector))) {
        clearKeyboardPress();
      }
    });

    function clearKeyboardPress() {
      keyboardPress?.element.removeAttribute("data-keyboard-pressed");
      keyboardPress = null;
      pressedControlObserver.disconnect();
    }

    function respondToKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") clearKeyboardPress();
      if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      if ((event.key !== " " && event.key !== "Enter") || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>(interactiveSelector);
      if (!target || target !== document.activeElement || target.matches(unavailableSelector)) return;
      const isNativeButton = target instanceof HTMLButtonElement;
      const isNativeLink = target instanceof HTMLAnchorElement && target.hasAttribute("href");
      // This only decorates native activation. Space must still scroll on links.
      if (!isNativeButton && !(isNativeLink && event.key === "Enter")) return;
      clearKeyboardPress();
      keyboardPress = { element: target, key: event.key };
      // WebKit can retain native :active after Space is cancelled by moving
      // focus. Keep keyboard styling under our lifecycle until pointer input.
      target.setAttribute("data-keyboard-activation", "true");
      target.setAttribute("data-keyboard-pressed", "true");
      pressedControlObserver.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["disabled", "aria-disabled", "data-effects"]
      });
    }

    function respondToKeyUp(event: KeyboardEvent) {
      if (event.key === keyboardPress?.key) clearKeyboardPress();
    }

    function respondToPointerDown(event: PointerEvent) {
      clearKeyboardPress();
      if (event.target instanceof Element) {
        event.target.closest(interactiveSelector)?.removeAttribute("data-keyboard-activation");
      }
    }

    function respondToVisibilityChange() {
      if (document.hidden) clearKeyboardPress();
    }

    function clearEffects() {
      if (motion.matches) {
        for (const timer of timers) clearTimeout(timer);
        timers.clear();
        setRipples([]);
      }
    }

    function respondToClick(event: MouseEvent) {
      if (motion.matches || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>(interactiveSelector);
      if (!target || target.matches(unavailableSelector)) return;
      const bounds = target.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;
      const style = getComputedStyle(target);
      const x = event.detail === 0 ? bounds.width / 2 : event.clientX - bounds.left;
      const y = event.detail === 0 ? bounds.height / 2 : event.clientY - bounds.top;
      const id = ++nextId;
      const ripple: Ripple = {
        id, left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height,
        radius: style.borderRadius, color: style.color, x, y,
        size: Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y)) * 2
      };
      setRipples((current) => [...current.slice(-5), ripple]);
      const timer = setTimeout(() => {
        setRipples((current) => current.filter((item) => item.id !== id));
        timers.delete(timer);
      }, 560);
      timers.add(timer);
    }

    document.addEventListener("click", respondToClick, true);
    document.addEventListener("keydown", respondToKeyDown);
    document.addEventListener("keyup", respondToKeyUp, true);
    document.addEventListener("focusout", clearKeyboardPress, true);
    document.addEventListener("pointerdown", respondToPointerDown, true);
    document.addEventListener("visibilitychange", respondToVisibilityChange);
    window.addEventListener("blur", clearKeyboardPress);
    motion.addEventListener("change", clearEffects);
    return () => {
      document.removeEventListener("click", respondToClick, true);
      document.removeEventListener("keydown", respondToKeyDown);
      document.removeEventListener("keyup", respondToKeyUp, true);
      document.removeEventListener("focusout", clearKeyboardPress, true);
      document.removeEventListener("pointerdown", respondToPointerDown, true);
      document.removeEventListener("visibilitychange", respondToVisibilityChange);
      window.removeEventListener("blur", clearKeyboardPress);
      motion.removeEventListener("change", clearEffects);
      clearKeyboardPress();
      document.querySelectorAll('[data-keyboard-activation="true"]').forEach((element) => {
        element.removeAttribute("data-keyboard-activation");
      });
      for (const timer of timers) clearTimeout(timer);
    };
  }, []);

  return (
    <div aria-hidden="true" className="interaction-ripple-layer">
      {ripples.map((ripple) => (
        <span className="interaction-ripple" key={ripple.id} style={{
          left: ripple.left, top: ripple.top, width: ripple.width, height: ripple.height,
          borderRadius: ripple.radius, color: ripple.color
        }}>
          <span style={{
            left: ripple.x - ripple.size / 2, top: ripple.y - ripple.size / 2,
            width: ripple.size, height: ripple.size
          }} />
        </span>
      ))}
    </div>
  );
}
