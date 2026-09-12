"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Content stays visible without JavaScript; motion enhances the rendered page. */
export function MotionScene({ children, className, sceneKey = "scene" }: {
  children: ReactNode; className: string; sceneKey?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    const animations = new Set<Animation>();
    const drift = Array.from(scope.querySelectorAll<HTMLElement>("[data-drift]"));
    const updateDrift = () => {
      frame = 0;
      const distance = Math.min(650, Math.max(0, -scope.getBoundingClientRect().top));
      drift.forEach(element => element.style.setProperty("--drift", distance * Number(element.dataset.drift) + "px"));
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(updateDrift); };
    const stop = () => {
      observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      animations.clear();
      window.removeEventListener("scroll", scroll);
      cancelAnimationFrame(frame);
      frame = 0;
      drift.forEach(element => element.style.removeProperty("--drift"));
    };
    const start = () => {
      stop();
      if (preference.matches) return;
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          const photo = element.dataset.reveal === "photo";
          // Animate position and framing, keeping text readable throughout entry.
          const animation = element.animate(photo ? [
            { clipPath: "inset(18% 5% 18% 5%)", transform: "scale(.94) rotate(3deg)" },
            { clipPath: "inset(0% 0% 0% 0%)", transform: "scale(1) rotate(0deg)" }
          ] : [
            { transform: "translateY(34px)" },
            { transform: "translateY(0)" }
          ], { duration: photo ? 950 : 700, delay: Number(element.dataset.delay ?? 0), easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
          observer?.unobserve(element);
        });
      }, { threshold: .08 });
      scope.querySelectorAll("[data-reveal]").forEach(element => observer?.observe(element));
      if (drift.length) {
        window.addEventListener("scroll", scroll, { passive: true });
        updateDrift();
      }
    };
    start();
    preference.addEventListener("change", start);
    return () => { stop(); preference.removeEventListener("change", start); };
  }, [sceneKey]);
  return <div ref={root} className={className}>{children}</div>;
}
