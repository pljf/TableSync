import { CalendarDays, LayoutDashboard, LogIn, LogOut, Plus, Share2, Utensils } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { User } from "@/lib/domain";
import { signOutAction } from "@/app/actions";

export function AppShell({ children, user }: { children: ReactNode; user?: User | null }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="TableSync home">
          <span className="brand-mark">
            <Utensils size={18} />
          </span>
          <span>TableSync</span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/demo">
            <Share2 size={16} />
            Demo
          </Link>
          <Link href="/dashboard">
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link href="/rooms/new">
            <Plus size={16} />
            New room
          </Link>
        </nav>
        <div className="topbar-actions">
          {user ? (
            <form action={signOutAction}>
              <button className="icon-text-button" type="submit">
                <LogOut size={16} />
                Sign out
              </button>
            </form>
          ) : (
            <Link className="icon-text-button" href="/auth">
              <LogIn size={16} />
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <span>
          <CalendarDays size={16} />
          Collaborative dinner planning demo
        </span>
      </footer>
    </div>
  );
}

