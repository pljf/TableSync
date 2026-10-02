"use client";

import { ArrowUpRight, LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import "@/lib/document-lifecycle";

export function MainNavigation({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const marketing = pathname === "/" || pathname === "/auth";
  if (marketing && !signedIn) return <nav className="nav-links new-navigation" aria-label="Main navigation"><Link href="/#how-it-works">How it works</Link><Link href="/preview">Explore an example <ArrowUpRight size={15} aria-hidden="true" /></Link></nav>;
  if (pathname === "/preview") return (
    <Suspense fallback={<WorkspaceNavigation pathname={pathname} />}>
      <PreviewNavigation />
    </Suspense>
  );
  return <WorkspaceNavigation pathname={pathname} />;
}

function PreviewNavigation() {
  const view = useSearchParams().get("view");
  return <WorkspaceNavigation pathname="/preview" view={view} />;
}

function WorkspaceNavigation({ pathname, view }: { pathname: string; view?: string | null }) {
  const preview = pathname === "/preview";
  const gatheringsHref = preview ? "/preview?view=dashboard" : "/dashboard";
  const newGatheringHref = preview ? "/preview?view=new" : "/rooms/new";
  return <nav className="nav-links new-navigation workspace-navigation" aria-label="Main navigation">
    <Link href={gatheringsHref} prefetch={false} aria-current={(preview ? view === "dashboard" : pathname === "/dashboard") ? "page" : undefined}><LayoutDashboard size={16} aria-hidden="true" />My gatherings</Link>
    <Link href={newGatheringHref} prefetch={false} aria-current={(preview ? view === "new" : pathname === "/rooms/new") ? "page" : undefined}><Plus size={16} aria-hidden="true" />New gathering</Link>
  </nav>;
}
