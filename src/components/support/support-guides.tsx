"use client";

import { useEffect, useRef } from "react";
import type { SupportArticle } from "@/lib/support/knowledge";

export function SupportGuides({ articles }: { articles: Pick<SupportArticle, "id" | "title" | "body">[] }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function sourceForHash(hash: string) {
      const id = hash.slice(1);
      return Array.from(list.current?.querySelectorAll("details") ?? []).find((element) => element.id === id);
    }
    function revealSource(hash = window.location.hash) {
      const article = sourceForHash(hash);
      if (article) { article.open = true; article.scrollIntoView({ block: "start" }); }
    }
    revealSource();
    const onHashChange = () => revealSource();
    function onSourceClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;
      const anchor = target?.closest("a");
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname !== window.location.pathname
        || destination.search !== window.location.search || !sourceForHash(destination.hash)) return;
      // Own known guide navigation so reopening the current hash does not rely
      // on a hashchange or compete with the browser's fragment default action.
      event.preventDefault();
      if (destination.hash !== window.location.hash) window.history.pushState(window.history.state, "", destination.href);
      revealSource(destination.hash);
    }
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onSourceClick);
    return () => { window.removeEventListener("hashchange", onHashChange); document.removeEventListener("click", onSourceClick); };
  }, []);
  return <div ref={list} className="support-articles">{articles.map((article) => <details key={article.id} id={article.id} className="support-article"><summary>{article.title}<span aria-hidden="true">+</span></summary><p>{article.body}</p></details>)}</div>;
}
