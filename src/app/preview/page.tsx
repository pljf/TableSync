import { Suspense } from "react";
import { GatheringPreview } from "@/components/rooms/gathering-preview";

export default function DesignPreviewPage() {
  return <><div className="design-preview-bar"><strong>Interactive example</strong><span>Sample data · Changes reset when you leave</span></div><Suspense fallback={<div className="demo-workspace"><p>Opening your example gathering…</p></div>}><GatheringPreview /></Suspense></>;
}
