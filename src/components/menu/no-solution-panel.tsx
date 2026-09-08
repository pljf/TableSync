import { AlertTriangle, WalletCards } from "lucide-react";
import Link from "next/link";
import type { NoSolutionReport } from "@/lib/domain";
import { eventTypeLabels, formatMoney, humanize } from "@/lib/format";
import { eventFormats } from "@/lib/event-formats";
import { Badge } from "@/components/ui/badge";

export function NoSolutionPanel({ report, editRoomHref }: { report: NoSolutionReport; editRoomHref?: string }) {
  const closest = report.closestOverBudgetPlan;

  return (
    <article className="card no-solution-panel" aria-labelledby="no-solution-title">
      <div className="card-heading">
        <div>
          <p className="eyebrow">{eventTypeLabels[report.eventType]} generation report</p>
          <h2 id="no-solution-title">No safe plan is ready yet</h2>
        </div>
        <Badge tone="warning">Action needed</Badge>
      </div>
      <p className="muted">{report.summary}</p>
      <p className="muted">{eventFormats[report.eventType].coverage}</p>
      <ul className="no-solution-list">
        {report.issues.map((issue) => (
          <li key={`${issue.code}-${issue.message}`}>
            <AlertTriangle aria-hidden="true" size={18} />
            <div>
              <strong>{humanize(issue.code)}</strong>
              <p>{issue.message}</p>
              {issue.affectedGuestNames.length > 0 ? (
                <small>Affected guests: {issue.affectedGuestNames.join(", ")}</small>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {closest ? (
        <section className="closest-plan-reference" aria-labelledby="closest-plan-title">
          <div>
            <p className="eyebrow">Reference only · not votable</p>
            <h3 id="closest-plan-title">{closest.title}</h3>
          </div>
          <WalletCards aria-hidden="true" size={22} />
          <p>
            The nearest complete option costs <strong>{formatMoney(closest.estimatedCostCents)}</strong>, which is{" "}
            <strong>{formatMoney(closest.overByCents)}</strong> above the {formatMoney(closest.budgetCents)} budget.
          </p>
          <p className="muted">{closest.dishNames.join(" · ")}</p>
        </section>
      ) : null}
      {editRoomHref ? (
        <div className="button-row form-actions">
          <Link className="button secondary" href={editRoomHref} prefetch={false}>Edit room details or budget</Link>
        </div>
      ) : null}
    </article>
  );
}
