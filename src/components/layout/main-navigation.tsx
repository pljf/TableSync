"use client";

import { ArrowUpRight, LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "@/lib/document-lifecycle";

export function MainNavigation({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const marketing = pathname === "/" || pathname === "/auth";
  if (marketing && !signedIn) return <nav className="nav-links new-navigation" aria-label="Main navigation"><Link href="/#how-it-works">How it works</Link><Link href="/preview">Explore an example <ArrowUpRight size={15} aria-hidden="true" /></Link></nav>;
  return <nav className="nav-links new-navigation workspace-navigation" aria-label="Main navigation">
    <Link href="/dashboard" prefetch={false} aria-current={pathname === "/dashboard" ? "page" : undefined}><LayoutDashboard size={16} aria-hidden="true" />My gatherings</Link>
    <Link href="/rooms/new" prefetch={false} aria-current={pathname === "/rooms/new" ? "page" : undefined}><Plus size={16} aria-hidden="true" />New gathering</Link>
  </nav>;
}
