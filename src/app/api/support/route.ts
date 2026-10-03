import { SUPPORT_CONTENT_LIMIT, SUPPORT_MESSAGE_LIMIT, type SupportMessage } from "@/lib/support/contracts";
import { answerSupportQuestion, getSupportMode } from "@/lib/support/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 100_000;
const REQUESTS_PER_MINUTE = 60;
// A fixed-size process-wide budget also bounds anonymous callers that rotate IPs.
// See docs/ai-support.md for multi-instance deployment limitations.
let windowStarted = 0;
let requestCount = 0;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extraHeaders } });
}

function validMessages(value: unknown): value is { messages: SupportMessage[] } {
  if (!value || typeof value !== "object" || !("messages" in value) || !Array.isArray(value.messages)) return false;
  if (!value.messages.length || value.messages.length > SUPPORT_MESSAGE_LIMIT) return false;
  return value.messages.at(-1)?.role === "user" && value.messages.every((message: unknown) => {
    if (!message || typeof message !== "object" || !("role" in message) || !("content" in message)) return false;
    return (message.role === "user" || message.role === "assistant")
      && typeof message.content === "string"
      && message.content.trim().length > 0
      && message.content.length <= SUPPORT_CONTENT_LIMIT;
  });
}

class BodyTooLargeError extends Error {}

async function readBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) throw new BodyTooLargeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        void reader.cancel().catch(() => {});
        throw new BodyTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

export async function GET() {
  return json({ mode: getSupportMode() });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "Please use the assistant from a TableSync page." }, 403);
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "Please send your question as JSON." }, 415);
  }
  const now = Date.now();
  if (!windowStarted || now - windowStarted >= 60_000 || now < windowStarted) {
    windowStarted = now;
    requestCount = 0;
  }
  if (requestCount >= REQUESTS_PER_MINUTE) {
    return json({ error: "Too many questions. Please wait a moment and try again." }, 429, { "Retry-After": String(Math.max(1, Math.ceil((windowStarted + 60_000 - now) / 1_000))) });
  }
  requestCount += 1;

  let payload: unknown;
  try {
    payload = await readBody(request);
  } catch (error) {
    return json({ error: error instanceof BodyTooLargeError ? "This conversation is too long. Please shorten it and try again." : "We couldn't read this request. Please send your question again." }, error instanceof BodyTooLargeError ? 413 : 400);
  }
  if (!validMessages(payload)) {
    return json({ error: `Send 1–${SUPPORT_MESSAGE_LIMIT} messages, each up to ${SUPPORT_CONTENT_LIMIT} characters, ending with your question.` }, 400);
  }
  const messages = payload.messages.map(({ role, content }) => ({ role, content: content.trim() }));
  return json(await answerSupportQuestion(messages));
}
