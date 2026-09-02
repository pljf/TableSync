import { KeyRound, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { GitHubSignInButton } from "@/components/auth/github-sign-in-button";
import { getCurrentUser } from "@/lib/auth";
import { authEnvironment } from "@/lib/auth-environment";

type PageProps = {
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function AuthPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const query: { error?: string } = searchParams ? await searchParams : {};
  if (user) {
    redirect("/dashboard");
  }
  const error = query.error;

  return (
    <section className="narrow-page">
      <div className="card auth-card">
        <KeyRound size={28} />
        <p className="eyebrow">Host authentication</p>
        <h1>Sign in to manage rooms</h1>
        <p className="muted">Use your GitHub identity to create rooms and manage only the dinner plans you own.</p>
        {error ? (
          <div className="feedback error-feedback" role="alert">
            Sign-in was not completed. No session was created; please try again.
          </div>
        ) : null}
        <GitHubSignInButton enabled={authEnvironment.productionReady} />
        {!authEnvironment.productionReady ? (
          <div className="feedback info-feedback" role="status">
            <ShieldCheck size={16} />
            Authentication is safely disabled until this environment has an HTTPS app URL, a strong session secret, and GitHub OAuth credentials.
          </div>
        ) : null}
      </div>
    </section>
  );
}
