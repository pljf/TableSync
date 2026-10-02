"use client";

import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Check, Copy, Headphones, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import type { SupportMessage, SupportReply } from "@/lib/support/contracts";

type ChatEntry = SupportMessage & { id: number; reply?: SupportReply };
const starters = ["How do I invite friends?", "Will changing the menu update my shopping list?", "How do we split the shopping?", "How long does a gathering last?"];
const subscribeToHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverHydratedSnapshot = () => false;

export function SupportChat({ compact = false, active = true }: { compact?: boolean; active?: boolean }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, hydratedSnapshot, serverHydratedSnapshot);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"ai" | "knowledge" | null>(null);
  const [configuredMode, setConfiguredMode] = useState<"ai" | "knowledge" | null>(null);
  const [error, setError] = useState("");
  const [failedQuestion, setFailedQuestion] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [hasNewAnswer, setHasNewAnswer] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const sequence = useRef(0);
  const followAnswer = useRef(true);
  const inputId = useId();
  const hintId = useId();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/support", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.mode === "ai" || data?.mode === "knowledge") { setMode(data.mode); setConfiguredMode(data.mode); } })
      .catch(() => undefined);
    return () => { controller.abort(); request.current?.abort(); };
  }, []);

  useEffect(() => {
    if (compact && active) input.current?.focus();
  }, [compact, active]);

  useEffect(() => {
    if (transcript.current && entries.length === 0) transcript.current.scrollTop = 0;
    else if (followAnswer.current && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [entries, busy]);

  function reset() {
    request.current?.abort();
    request.current = null;
    inFlight.current = false;
    setBusy(false);
    setEntries([]);
    setError("");
    setFailedQuestion("");
    setDraft("");
    setHasNewAnswer(false);
    input.current?.focus();
  }

  async function send(question: string, retry = false) {
    const content = question.trim();
    if (!content || content.length > 2000 || inFlight.current) return;
    const controller = new AbortController();
    request.current = controller;
    inFlight.current = true;
    const next: ChatEntry[] = retry ? entries : [...entries, { id: ++sequence.current, role: "user", content }];
    setEntries(next);
    setDraft("");
    setError("");
    setFailedQuestion("");
    setBusy(true);
    followAnswer.current = true;
    setHasNewAnswer(false);
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12).map(({ role, content: text }) => ({ role, content: text.slice(0, 2000) })) }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(response.status === 429 ? "You've sent several questions. Please wait a minute and try again." : "We couldn't get an answer. Try again, or browse the help guides below.");
      const reply: SupportReply = await response.json();
      if (!reply.answer || !Array.isArray(reply.sources) || !["ai", "knowledge"].includes(reply.mode)) throw new Error("The answer didn't load completely. Please try again.");
      if (request.current !== controller) return;
      setMode(reply.mode);
      setEntries((previous) => [...previous, { id: ++sequence.current, role: "assistant", content: reply.answer, reply }]);
      if (!followAnswer.current) setHasNewAnswer(true);
    } catch (failure) {
      if (request.current !== controller) return;
      setError(controller.signal.aborted ? "The answer took too long. Please try again." : failure instanceof TypeError ? "The connection was interrupted. Check your network and try again." : failure instanceof Error ? failure.message : "We couldn't get an answer. Please try again.");
      setFailedQuestion(content);
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        inFlight.current = false;
        setBusy(false);
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send(draft); }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      void send(draft);
    }
  }
  async function copy(entry: ChatEntry) {
    try { await navigator.clipboard.writeText(entry.content); setCopied(entry.id); }
    catch { setError("We couldn't copy the answer. Select the text to copy it manually."); }
  }

  return <div className={`support-chat${compact ? " support-chat-compact" : ""}`} lang="en">
    <div className="support-chat-toolbar">
      <span className="support-mode"><span aria-hidden="true" />{mode === "ai" ? "AI · Guided by TableSync help" : mode === "knowledge" ? "Help guides · No sign-in needed" : "TableSync help"}</span>
      <button type="button" className="support-icon-button" onClick={reset} disabled={!entries.length && !draft} aria-label="Start a new conversation" title="Start a new conversation"><RotateCcw size={16} aria-hidden="true" /></button>
    </div>
    <div className="support-transcript" ref={transcript} role="log" tabIndex={0} aria-label="Assistant conversation" aria-live="polite" aria-relevant="additions" aria-busy={busy} onScroll={() => {
      const box = transcript.current;
      if (box) followAnswer.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      if (followAnswer.current) setHasNewAnswer(false);
    }}>
      <div className="support-welcome">
        <span className="support-avatar"><Headphones size={23} aria-hidden="true" /></span>
        <h2>Hi, I’m your TableSync assistant.</h2>
        <p>From the first invitation to the last grocery run,<br className="support-desktop-break" />{" "}ask me how to use TableSync.</p>
        <p className="support-welcome-note">I&apos;ll share practical steps and related guides. If I don&apos;t know, I&apos;ll say so.</p>
      </div>
      {!entries.length && <div className="support-starters" aria-label="Try a question">{starters.map((question) => <button key={question} type="button" disabled={!hydrated} onClick={() => void send(question)}>{question}<ArrowUp size={15} aria-hidden="true" /></button>)}</div>}
      {entries.map((entry) => <article key={entry.id} className={`support-message support-message-${entry.role}`}>
        <span className="support-speaker">{entry.role === "user" ? "You" : "TableSync assistant"}</span>
        <div className="support-message-content">{entry.content}</div>
        {entry.reply && <>
          {entry.reply.sources.length > 0 && <div className="support-sources"><span><BookOpen size={13} aria-hidden="true" /> Related guide</span>{entry.reply.sources.filter((source) => /^\/help#[a-z0-9-]+$/.test(source.href)).map((source) => <a href={source.href} key={source.id}>{source.title}<ArrowRight size={12} aria-hidden="true" /></a>)}</div>}
          {entry.reply.notice && <p className="support-reply-notice">{entry.reply.notice}</p>}
          <button className="support-copy" type="button" onClick={() => void copy(entry)} aria-label={copied === entry.id ? "Answer copied" : "Copy answer"}>{copied === entry.id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}{copied === entry.id ? "Copied" : "Copy"}</button>
        </>}
      </article>)}
      {busy && <div className="support-thinking" role="status"><LoaderCircle size={16} aria-hidden="true" />Checking the help guides…</div>}
    </div>
    {hasNewAnswer && <button className="support-new-answer" type="button" onClick={() => { followAnswer.current = true; setHasNewAnswer(false); if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }}>View new answer<ArrowDown size={14} aria-hidden="true" /></button>}
    {error && <div className="support-error" role="alert"><span>{error}</span>{failedQuestion && <button type="button" onClick={() => void send(failedQuestion, true)} disabled={busy}>Try again</button>}</div>}
    <form className="support-composer" onSubmit={submit}>
      <label htmlFor={inputId} className="support-sr-only">Ask the TableSync assistant</label>
      <div className="support-input-wrap"><textarea ref={input} id={inputId} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} disabled={!hydrated} placeholder="For example: How do I invite friends?" rows={2} maxLength={2000} aria-describedby={hintId} /><button type="submit" className="support-send" disabled={!hydrated || busy || !draft.trim()} aria-label="Send question"><ArrowUp size={19} aria-hidden="true" /></button></div>
      <div className="support-composer-hint" id={hintId}><span>{configuredMode === "knowledge" ? "Answers from the user guide · No AI model connected" : configuredMode === "ai" ? "Messages may be sent to an AI service. Don't include passwords or private information." : "Ask a TableSync question. Don't include passwords or private information."}</span>{draft.length > 1800 && <span>{draft.length}/2000</span>}</div>
    </form>
  </div>;
}
