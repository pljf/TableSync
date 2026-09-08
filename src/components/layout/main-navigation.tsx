"use client";

import { LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "@/lib/document-lifecycle";

const destinations = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rooms/new", label: "New room", icon: Plus }
];

export function MainNavigation() {
  const pathname = usePathname();

  return (
    <nav className="nav-links" aria-label="Main navigation">
      {destinations.map(({ href, label, icon: Icon }) => (
        <Link
          aria-current={pathname === href ? "page" : undefined}
          className={`main-nav-link${pathname === href ? " is-active" : ""}`}
          href={href}
          key={href}
          prefetch={false}
        >
          <Icon aria-hidden="true" size={16} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
