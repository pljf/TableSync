"use client";

import type { ReactNode } from "react";

export function OptionalCreationFields({ title, section, children }: {
  title: string;
  section: "gathering" | "preferences";
  children: ReactNode;
}) {
  return (
    <details className="creation-optional" data-optional-section={section}
      onInvalidCapture={(event) => { event.currentTarget.open = true; }}>
      <summary>{title}<span>Optional</span></summary>
      <div className="creation-optional-fields">{children}</div>
    </details>
  );
}
