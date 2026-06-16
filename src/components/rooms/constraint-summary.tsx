import { AlertTriangle, BadgeDollarSign, Leaf, Sparkles } from "lucide-react";
import type { Guest, SpiceLevel } from "@/lib/domain";
import { dietLabels, formatMoney, spiceLabels } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const spiceRank: Record<SpiceLevel, number> = {
  NONE: 0,
  MILD: 1,
  MEDIUM: 2,
  HOT: 3
};

export function ConstraintSummary({ guests }: { guests: Guest[] }) {
  const allergies = [...new Set(guests.flatMap((guest) => guest.preference.allergies))];
  const likes = [...new Set(guests.flatMap((guest) => guest.preference.likes))].slice(0, 8);
  const diets = guests.reduce<Record<string, number>>((acc, guest) => {
    acc[guest.preference.dietType] = (acc[guest.preference.dietType] ?? 0) + 1;
    return acc;
  }, {});
  const budgets = guests.map((guest) => guest.preference.maxBudgetCents).filter((value): value is number => typeof value === "number");
  const lowestSpice = guests.reduce<SpiceLevel>(
    (lowest, guest) => (spiceRank[guest.preference.spiceLevel] < spiceRank[lowest] ? guest.preference.spiceLevel : lowest),
    "HOT"
  );

  return (
    <section className="grid two">
      <article className="card">
        <div className="section-title">
          <Leaf size={18} />
          <h2>Diet coverage</h2>
        </div>
        <div className="tag-list">
          {Object.entries(diets).map(([diet, count]) => (
            <Badge key={diet} tone={diet === "OMNIVORE" ? "neutral" : "success"}>
              {dietLabels[diet as keyof typeof dietLabels]}: {count}
            </Badge>
          ))}
        </div>
      </article>
      <article className="card">
        <div className="section-title">
          <AlertTriangle size={18} />
          <h2>Hard constraints</h2>
        </div>
        <div className="tag-list">
          {allergies.length > 0 ? allergies.map((allergy) => <Badge key={allergy} tone="danger">{allergy}</Badge>) : <span className="muted">No allergies recorded</span>}
        </div>
      </article>
      <article className="card">
        <div className="section-title">
          <Sparkles size={18} />
          <h2>Common likes</h2>
        </div>
        <div className="tag-list">
          {likes.length > 0 ? likes.map((like) => <Badge key={like} tone="info">{like}</Badge>) : <span className="muted">No likes yet</span>}
        </div>
      </article>
      <article className="card">
        <div className="section-title">
          <BadgeDollarSign size={18} />
          <h2>Guest comfort</h2>
        </div>
        <p className="muted">
          {budgets.length > 0 ? `Lowest guest budget: ${formatMoney(Math.min(...budgets))}` : "No guest budget limits submitted"}
        </p>
        <p className="muted">Lowest spice tolerance: {spiceLabels[lowestSpice]}</p>
      </article>
    </section>
  );
}
