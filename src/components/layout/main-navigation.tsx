"use client";

import { ArrowUpRight, LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "@/lib/document-lifecycle";

export function MainNavigation({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const preview = pathname === "/preview";
  const gatheringsHref = preview ? "/preview?view=dashboard" : "/dashboard";
  const newGatheringHref = preview ? "/preview?view=new" : "/rooms/new";
  const marketing = pathname === "/" || pathname === "/auth";
  if (marketing && !signedIn) return <nav className="nav-links new-navigation" aria-label="Main navigation"><Link href="/#how-it-works">How it works</Link><Link href="/preview">Explore an example <ArrowUpRight size={15} aria-hidden="true" /></Link></nav>;
  return <nav className="nav-links new-navigation workspace-navigation" aria-label="Main navigation">
    <Link href={gatheringsHref} prefetch={false} aria-current={pathname === "/dashboard" ? "page" : undefined}><LayoutDashboard size={16} aria-hidden="true" />My gatherings</Link>
    <Link href={newGatheringHref} prefetch={false} aria-current={pathname === "/rooms/new" ? "page" : undefined}><Plus size={16} aria-hidden="true" />New gathering</Link>
  </nav>;
}
