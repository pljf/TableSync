"use client";

import { ArrowUpRight, Headphones, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { SupportChat } from "@/components/support/support-chat";

export function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  if (pathname === "/help") return null;
  function close() { setOpen(false); launcher.current?.focus(); }

  return <div className="support-widget" lang="en" onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); close(); } }}>
    {mounted && <aside id="support-panel" className="support-panel" hidden={!open} aria-label="TableSync assistant">
      <div className="support-panel-header"><span><Headphones size={19} aria-hidden="true" /><strong>TableSync assistant</strong></span><a className="support-icon-button" href="/help" aria-label="Open the help center" title="Open the help center"><ArrowUpRight size={18} aria-hidden="true" /></a><button type="button" className="support-icon-button" onClick={close} aria-label="Close assistant"><X size={19} aria-hidden="true" /></button></div>
      <SupportChat compact active={open} />
    </aside>}
    <button ref={launcher} type="button" className="support-launcher" aria-controls={mounted ? "support-panel" : undefined} aria-expanded={open} onClick={() => { if (open) close(); else { setMounted(true); setOpen(true); } }}><Headphones size={20} aria-hidden="true" /><span>{open ? "Minimize assistant" : "Ask TableSync"}</span></button>
  </div>;
}
