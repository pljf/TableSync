"use client";

import Link, { useLinkStatus } from "next/link";
import { RoomSync } from "@/components/rooms/room-sync";

type RoomSection = "overview" | "plans" | "shopping" | "share" | "preferences";

function RoomLinkContent({ label }: { label: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span className="room-nav-label" data-pending={pending}>
        {label}
        <span aria-hidden="true" className="room-nav-indicator">
          {pending ? <span className="button-spinner" /> : null}
        </span>
      </span>
      <span aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {pending ? `Opening ${label}…` : ""}
      </span>
    </>
  );
}

export function RoomNavigation({
  active,
  guestCanViewPreferences = false,
  initialRevision,
  roomId,
  shareAvailable
}: {
  active: RoomSection;
  guestCanViewPreferences?: boolean;
  initialRevision?: string;
  roomId: string;
  shareAvailable: boolean;
}) {
  const links: Array<{ href: string; label: string; section: RoomSection }> = [
    { href: `/rooms/${roomId}`, label: "Overview", section: "overview" },
    { href: `/rooms/${roomId}/plans`, label: "Plans", section: "plans" },
    { href: `/rooms/${roomId}/shopping`, label: "Shopping", section: "shopping" },
    ...(guestCanViewPreferences ? [{ href: `/preferences?roomId=${encodeURIComponent(roomId)}`, label: "My preferences", section: "preferences" as const }] : []),
    ...(shareAvailable ? [{ href: `/share/${roomId}`, label: "Share", section: "share" as const }] : [])
  ];

  return (
    <nav className="tab-nav" aria-label="Room sections">
      <RoomSync initialRevision={initialRevision} key={roomId} roomId={roomId} />
      {links.map((link) => (
        <Link
          aria-current={active === link.section ? "page" : undefined}
          aria-label={link.label}
          href={link.href}
          key={link.section}
          prefetch={false}
        >
          <RoomLinkContent label={link.label} />
        </Link>
      ))}
    </nav>
  );
}
