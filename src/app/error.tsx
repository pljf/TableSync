"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="narrow-page" role="alert">
      <article className="card empty-state error-state">
        <AlertTriangle aria-hidden="true" size={28} />
        <p className="eyebrow">We could not finish that action</p>
        <h1>Nothing was intentionally discarded</h1>
        <p className="muted">
          Check your connection and try again. If the problem continues, return to the room and confirm its current stage.
        </p>
        <div className="button-row">
          <button className="button" onClick={reset} type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Try again
          </button>
          <Link className="button secondary" href="/dashboard" prefetch={false}>
            Return to dashboard
          </Link>
        </div>
      </article>
    </section>
  );
}
