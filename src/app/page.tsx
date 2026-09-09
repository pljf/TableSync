import { ArrowRight, Leaf } from "lucide-react";
import Link from "next/link";
import { TableScene } from "@/components/brand/table-scene";
import { GuestSignInButton } from "@/components/auth/guest-sign-in-button";
import { getCurrentUser } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";

export const dynamic = "force-dynamic";

const planningSteps = [
  { number: "01", title: "Bring everyone in.", description: "Send one invite link. Your guests share what they love, what they avoid, and what they can bring." },
  { number: "02", title: "Find your menu.", description: "Find a menu for your gathering, from brunch to a backyard BBQ. Everyone gets a say before you make the final pick." },
  { number: "03", title: "Share the shopping.", description: "Divide up one grocery list or claim whole dishes for a potluck. Check things off and look forward to your meal." }
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="page-stack landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-kicker">A place for everyone</p>
          <h1 className="landing-title" id="landing-title">Good company.<br />One <em>shared plan.</em></h1>
          <p className="landing-description">Less back-and-forth. More around-the-table. Plan a meal that works for your people, from the first invite to the last thing on the shopping list.</p>
          <div className="button-row landing-actions">
            {user ? (
              <Link className="button" href="/dashboard" prefetch={false}>Open your dashboard <ArrowRight aria-hidden="true" size={17} /></Link>
            ) : (
              <>
                <GuestSignInButton disabled={!authEnvironment.sessionReady} />
                <Link className="button secondary" href="/auth" prefetch={false}>Sign in</Link>
              </>
            )}
          </div>
          <p className="landing-footnote"><Leaf aria-hidden="true" size={15} /> No login needed. Create a room and try the whole flow.</p>
        </div>
        <div className="landing-scene">
          <p className="landing-scene-label">Something good is coming together</p>
          <TableScene />
          <div className="landing-scene-caption"><span>Pull up a chair.</span><span>We’ll help with the plan.</span></div>
        </div>
      </section>

      <section className="landing-workflow" aria-labelledby="workflow-title">
        <div className="landing-section-heading">
          <p className="landing-kicker">From “let’s eat soon” to a meal together.</p>
          <h2 id="workflow-title">A little planning.<br />A better evening.</h2>
        </div>
        <div className="landing-steps">
          {planningSteps.map((step) => (
            <article className="landing-step" key={step.number}>
              <span className="landing-step-number" aria-hidden="true">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-demo" aria-labelledby="getting-started-title">
        <div className="landing-demo-intro">
          <p className="landing-kicker">A look around the table</p>
          <h2 id="getting-started-title">Your next gathering,<br /><em>sorted.</em></h2>
          <p>A room for the people. A menu for the group. A shopping list everyone can lend a hand with.</p>
        </div>
        <div className="landing-demo-card">
          <p className="eyebrow">Make yourself at home</p>
          <h3>Everything is yours to try.</h3>
          <p className="muted">Choose Dinner, Hotpot, Potluck, BBQ, Picnic, Brunch, or Other for a shared buffet. Add preferences, compare complete menus, and share the shopping. For potlucks, guests can claim whole dishes. Your guest account keeps your rooms together in this browser.</p>
          <p className="muted">Guest access lasts up to 7 days. Clearing cookies or ending your session removes your access; it cannot be recovered on another device.</p>
          <Link className="button secondary" href={user ? "/rooms/new" : "/auth"} prefetch={false}>Plan a gathering <ArrowRight aria-hidden="true" size={16} /></Link>
        </div>
      </section>
    </div>
  );
}
