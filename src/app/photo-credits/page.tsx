import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { photos } from "@/lib/photo-library";

export const metadata: Metadata = { title: "Photo credits · TableSync" };

export default function PhotoCreditsPage() {
  return <div className="photo-credits-page">
    <Link className="workspace-back" href="/"><ArrowLeft size={16} aria-hidden="true" />Back to TableSync</Link>
    <span className="editorial-label">THE PEOPLE BEHIND THE PICTURES</span>
    <h1>Good food.<br /><em>Real moments.</em></h1>
    <p className="photo-credits-intro">A little credit to the photographers who bring our tables to life. Food photos offer serving inspiration; the ingredients in your selected menu may differ from those pictured.</p>
    <div className="photo-credits-grid">{photos.map(photo => <article key={photo.id} id={photo.id}>
      <Image src={photo.src} alt={photo.alt} width={600} height={400} sizes="(max-width: 760px) 100vw, (max-width: 1050px) 45vw, 350px" />
      <div><h2>{photo.title}</h2><p>Photography by {photo.author}</p><a href={photo.source} target="_blank" rel="noreferrer">Original photograph <ArrowUpRight size={14} aria-hidden="true" /></a><a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a></div>
    </article>)}</div>
    <p className="photo-credits-note">Photos have been resized, converted to WebP and cropped to fit the page. No generative edits were used. Each CC BY-SA photograph remains available under its linked CC BY-SA license; these terms apply to the photograph itself.</p>
  </div>;
}

