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
          This build uses a demo host session so the workflow runs locally without OAuth credentials. The Prisma schema and
          README keep the Auth.js target explicit.
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
