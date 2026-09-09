import type { ReactNode } from "react";

export function ButtonContent({
  children,
  pending,
  pendingLabel,
  iconOnly = false
}: {
  children: ReactNode;
  pending: boolean;
  pendingLabel: string;
  iconOnly?: boolean;
}) {
  return (
    <span className="button-content">
      <span aria-hidden={pending} className="button-label" data-visible={!pending}>{children}</span>
      <span aria-hidden={!pending} className="button-pending" data-visible={pending}>
        <span aria-hidden="true" className="button-spinner" />
        {!iconOnly ? pendingLabel : null}
      </span>
    </span>
  );
}
