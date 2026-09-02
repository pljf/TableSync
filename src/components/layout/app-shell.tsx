import { CalendarDays, LayoutDashboard, LogIn, Plus, Share2, Utensils } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { User } from "@/lib/domain";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function AppShell({ children, user }: { children: ReactNode; user?: User | null }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="TableSync home" prefetch={false}>
          <span className="brand-mark">
            <Utensils size={18} />
          </span>
          <span>TableSync</span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/demo" prefetch={false}>
            <Share2 size={16} />
            Demo
          </Link>
          <Link href="/dashboard" prefetch={false}>
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link href="/rooms/new" prefetch={false}>
            <Plus size={16} />
            New room
          </Link>
        </nav>
        <div className="topbar-actions">
          {user ? (
            <SignOutButton />
          ) : (
            <Link className="icon-text-button" href="/auth" prefetch={false}>
              <LogIn size={16} />
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="footer">
        <span>
          <CalendarDays size={16} />
          Collaborative dinner planning demo
        </span>
      </footer>
    </div>
  );
}

