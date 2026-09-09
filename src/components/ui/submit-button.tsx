"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ButtonContent } from "@/components/ui/button-content";

type SubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: ReactNode;
  pendingLabel: string;
};

export function SubmitButton({ children, disabled, pendingLabel, ...props }: SubmitButtonProps) {
  const { pending, data } = useFormStatus();
  const selected = !props.name || String(data?.get(props.name) ?? "") === String(props.value ?? "");
  const activePending = pending && selected;
  const iconOnly = props.className?.split(/\s+/).includes("icon-button");

  return (
    <button
      {...props}
      aria-busy={activePending}
      aria-label={activePending && props["aria-label"] ? `${props["aria-label"]}: ${pendingLabel}` : props["aria-label"]}
      data-pending-label={pendingLabel}
      data-state={activePending ? "pending" : "idle"}
      disabled={disabled || pending}
      type="submit"
    >
      <ButtonContent iconOnly={iconOnly} pending={activePending} pendingLabel={pendingLabel}>{children}</ButtonContent>
    </button>
  );
}
