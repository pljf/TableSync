import type { Metadata } from "next";
import { ArrowDown, ArrowLeft, BookOpen, MessageCircle } from "lucide-react";
import Link from "next/link";
import { SupportChat } from "@/components/support/support-chat";
import { SupportGuides } from "@/components/support/support-guides";
import { supportArticles } from "@/lib/support/knowledge";

export const metadata: Metadata = { title: "Help & assistant · TableSync", description: "Get help with TableSync invitations, menus, shopping lists, and shared responsibilities." };

export default function HelpPage() {
  return <div className="support-page" lang="en">
    <Link className="support-back" href="/" prefetch={false}><ArrowLeft size={15} aria-hidden="true" />Back to TableSync</Link>
    <section className="support-stage" aria-labelledby="support-title">
      <div className="support-intro">
        <h1 id="support-title">A little help,<br />{" "}for your next gathering.</h1>
        <p>Inviting friends? Changing the menu?<br />{" "}Tell me where you&apos;re stuck, and find your next step.</p>
        <div className="support-intro-topics"><span>Invitations</span><span>Menus & voting</span><span>Shopping & sharing</span></div>
        <a href="#support-guides" className="support-guide-link">Browse the help guides<ArrowDown size={16} aria-hidden="true" /></a>
        <div className="support-intro-footnote"><MessageCircle size={19} aria-hidden="true" /><p>Ask a question, then follow up.<br />Related guides let you check the details.</p></div>
      </div>
      <section className="support-desk" aria-label="Chat with the TableSync assistant"><SupportChat /></section>
    </section>
    <section className="support-guides" id="support-guides" aria-labelledby="support-guides-title">
      <div className="support-guides-heading"><BookOpen size={23} aria-hidden="true" /><h2 id="support-guides-title">Find your next step.</h2><p>Guides to the features available in TableSync</p></div>
      <SupportGuides articles={supportArticles.map(({ id, title, body }) => ({ id, title, body }))} />
    </section>
  </div>;
}
