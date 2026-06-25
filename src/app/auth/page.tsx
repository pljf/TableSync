import { KeyRound, UserRound } from "lucide-react";
import { signInDemoHostAction } from "@/app/actions";

export default function AuthPage() {
  return (
    <section className="narrow-page">
      <div className="card auth-card">
        <KeyRound size={28} />
        <p className="eyebrow">Host authentication</p>
        <h1>Sign in to manage rooms</h1>
        <p className="muted">
          This build stores rooms in PostgreSQL but still uses a demo host session so the workflow runs without OAuth
          credentials. Auth.js remains the next authentication milestone.
        </p>
        <form action={signInDemoHostAction}>
          <button className="button full" type="submit">
            <UserRound size={16} />
            Continue as demo host
          </button>
        </form>
      </div>
    </section>
  );
}
