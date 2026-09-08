import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GitHubSignInButton } from "@/components/auth/github-sign-in-button";
import { GuestSignInButton } from "@/components/auth/guest-sign-in-button";
import { TableScene } from "@/components/brand/table-scene";
import { getCurrentUser } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";

type PageProps = {
  searchParams?: Promise<{ error?: string; upgrade?: string }> | { error?: string; upgrade?: string };
};

export default async function AuthPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const query = searchParams ? await searchParams : {};
  const upgrading = Boolean(user?.isAnonymous && query.upgrade === "1");
  if (user && !upgrading) redirect("/dashboard");

  if (upgrading) {
    return (
      <section className="narrow-page">
        <article className="card form-card">
          <Link className="icon-text-button" href="/dashboard" prefetch={false}><ArrowLeft aria-hidden="true" size={16} /> Back to my rooms</Link>
          <div>
            <p className="eyebrow">Keep your rooms</p>
            <h1>Save my rooms</h1>
            <p className="muted">Connect GitHub to keep the rooms you host and return from another browser or device. Your current guest account stays signed in while you connect.</p>
          </div>
          {query.error ? <p className="feedback error-feedback" role="alert">Saving your account was not completed. Try again or return to your rooms.</p> : null}
          <GitHubSignInButton enabled={authEnvironment.productionReady} upgrade />
          {!authEnvironment.productionReady ? <p className="feedback info-feedback" role="status">Account saving is not set up in this installation yet. Your guest session is still active; keep this browser and its cookies to return for up to 7 days.</p> : null}
          <p className="muted">Meal responses remain saved separately in this browser for up to 30 days. Connecting GitHub saves the rooms you host; it does not transfer guest responses to another device.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="page-stack auth-page">
      <div className="auth-story">
        <div className="auth-story-copy">
          <p className="landing-kicker">You bring the people.</p>
          <h2 className="auth-story-title">Let’s make<br />an <em>evening of it.</em></h2>
          <p>One shared place for everyone’s preferences, the menu, and who’s bringing what.</p>
        </div>
        <TableScene />
      </div>
      <div className="auth-panel">
        <Link className="icon-text-button auth-back-link" href="/" prefetch={false}><ArrowLeft aria-hidden="true" size={16} /> Back to TableSync</Link>
        <div className="auth-panel-icon"><KeyRound aria-hidden="true" size={23} /></div>
        <p className="eyebrow">Welcome to the table</p>
        <h1>Come on in.</h1>
        <p className="muted">Create rooms, plan menus, and share the shopping. Start as a guest with no login, or use GitHub to return across devices.</p>
        {query.error ? (
          <div className="feedback error-feedback" role="alert">Sign-in was not completed. No session was created; please try again.</div>
        ) : null}
        <GuestSignInButton disabled={!authEnvironment.sessionReady} className="button full" />
        {!authEnvironment.sessionReady ? (
          <div className="feedback info-feedback" role="status">
            <span>Guest access is temporarily unavailable. Please try again later.</span>
          </div>
        ) : null}
        <p className="muted">Guest access stays in this browser for up to 7 days. Ending the session or clearing cookies removes your access to its rooms.</p>
        <GitHubSignInButton enabled={authEnvironment.productionReady} />
        {!authEnvironment.productionReady ? <p className="muted">GitHub sign-in isn’t set up here yet. You can use all planning features as a guest.</p> : null}
        <div className="auth-panel-footer">
          <p>Invited to a meal?</p>
          <p className="muted">Open the invite link from your host to share your meal preferences.</p>
        </div>
      </div>
    </section>
  );
}
