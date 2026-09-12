import { ArrowUpRight, Utensils } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { User } from "@/lib/domain";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MainNavigation } from "@/components/layout/main-navigation";
import { InteractionEffects } from "@/components/ui/interaction-effects";

export function AppShell({ children, user }: { children: ReactNode; user?: User | null }) {
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className="topbar site-header">
      <Link href="/" className="brand" aria-label="TableSync home" prefetch={false}><span className="brand-mark"><Utensils aria-hidden="true" size={19} /></span><span className="brand-wordmark">TableSync</span></Link>
      <MainNavigation signedIn={Boolean(user)} />
      <div className="topbar-actions">{user ? <SignOutButton isGuest={user.isAnonymous} /> : <Link className="icon-text-button" href="/auth" prefetch={false}>Get started <ArrowUpRight aria-hidden="true" size={15} /></Link>}</div>
    </header>
    <main id="main-content">{children}</main>
    <footer className="footer"><Link href="/" className="footer-brand"><Utensils aria-hidden="true" size={17} />TableSync</Link><span>Good food. Better together.</span><Link className="footer-photo-link" href="/photo-credits">Photo credits</Link></footer>
    <InteractionEffects />
  </div>;
}

