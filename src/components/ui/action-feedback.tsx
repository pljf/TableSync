import { AlertCircle, CheckCircle2 } from "lucide-react";

export function ActionFeedback({
  state,
  message,
  id,
  className = ""
}: {
  state: "idle" | "pending" | "success" | "error";
  message?: string;
  id?: string;
  className?: string;
}) {
  if (state === "idle" || !message) return null;
  return (
    <p
      aria-atomic="true"
      className={`form-feedback action-feedback ${state === "error" ? "field-error" : state === "success" ? "success-text" : "muted"} ${className}`.trim()}
      data-state={state}
      id={id}
      role={state === "error" ? "alert" : "status"}
      tabIndex={state === "error" ? -1 : undefined}
    >
      {state === "pending" ? <span aria-hidden="true" className="button-spinner action-feedback-icon" /> : state === "error" ? <AlertCircle aria-hidden="true" className="action-feedback-icon" size={16} /> : <CheckCircle2 aria-hidden="true" className="action-feedback-icon" size={16} />}
      <span>{message}</span>
    </p>
  );
}
