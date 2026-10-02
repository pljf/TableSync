"use client";

import type { ReactNode } from "react";

export function OptionalCreationFields({ title, section, children }: {
  title: string;
  section: "gathering" | "preferences";
  children: ReactNode;
}) {
  return (
    <details className="creation-optional" data-optional-section={section}
      onInvalidCapture={(event) => {
        const details = event.currentTarget;
        const wasClosed = !details.open;
        details.open = true;
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
        if (!wasClosed || field.form?.querySelector("input:invalid, select:invalid, textarea:invalid") !== field) return;
        // WebKit skips focusing a control that was hidden when validation began.
        // Wait for the opened section to render, then show its native feedback.
        requestAnimationFrame(() => {
          if (field.isConnected && details.open && !field.validity.valid) {
            field.focus();
            field.reportValidity();
          }
        });
      }}>
      <summary>{title}<span>Optional</span></summary>
      <div className="creation-optional-fields">{children}</div>
    </details>
  );
}
