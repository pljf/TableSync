import Link from "next/link";
import { Suspense } from "react";
import { GatheringPreview } from "@/components/rooms/gathering-preview";

export default function DesignPreviewPage() {
  return <><div className="design-preview-bar"><strong>Interactive example</strong><span>Sample data · Changes reset when you leave</span><Link href="/rooms/new" prefetch={false}>Start your own gathering</Link></div><Suspense fallback={<div className="demo-workspace"><p>Opening your example gathering…</p></div>}><GatheringPreview /></Suspense></>;
}
