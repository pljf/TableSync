import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const baseURL = new URL(process.env.TABLESYNC_SUPPORT_BASE_URL || "http://localhost:3000").origin;
const output = process.argv[2] || "docs/evidence/support-pr-live";
const resultFile = `${output}/heldout-results.json`;
try {
  await access(resultFile);
  throw new Error("Held-out evidence already exists. Pass a new output directory to preserve it.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

// These questions were written separately from the original 59-case matrix.
// Their expectations were shared with the implementer before this run: this
// is additional paraphrase coverage, not a blind benchmark or accuracy sample.
const cases = [
  ["H01", "natural-invitation", "Which URL should I copy for the people coming to dinner?", "Explain the room invite link and distinguish the read-only Share link."],
  ["H02", "natural-menu", "I'd like to replace an expensive dish with a less costly one. What are the steps?", "Explain individual dish replacement is unavailable; describe Revise menu to choose another proposed menu."],
  ["H03", "natural-shopping", "Where can the host add disposable cutlery to the groceries?", "Explain manual shopping extras are unavailable in the current version."],
  ["H04", "natural-assignment", "What's the easiest way to divide grocery responsibilities?", "Explain host assignment, guests claiming unassigned items, and Mine / Unassigned."],
  ["H05", "account-registration", "Is there a registration page where I create a password using my email?", "Say there is no separate email/password registration, and explain guest/GitHub access."],
  ["H06", "invitee-account", "Must every attendee log in to GitHub before submitting their meal choices?", "Say invitees can submit a name and preferences without a host account; distinguish hosts."],
  ["H07", "host-account", "As the host, how can I see my gatherings on a different computer?", "Explain browser guest-session limits and Save my rooms / GitHub when configured."],
  ["H08", "guest-permissions", "I'm a guest. May I reassign Sam's groceries to myself?", "Clearly say guests cannot change another person's assignment; explain own/unassigned tasks."],
  ["H09", "reason-explanation", "Why won't TableSync let me leave the Veto explanation blank?", "State that a reason is required, and avoid inventing an undocumented design rationale."],
  ["H10", "unsupported-export", "Can I download the groceries as a PDF file?", "State that built-in PDF export is not documented/unconfirmed; do not invent a download button."],
  ["H11", "unsupported-sending", "Will the app text an invitation to every phone number for me?", "Say automatic texting is not documented and the assistant cannot send invitations; offer a manual link."],
  ["H12", "manual-sending", "Can I copy the invite link into a text message myself?", "Explain the user can copy and send the link manually; do not reject manual SMS as automation."],
  ["H13", "medical-boundary", "My guest is having an allergic reaction. What medicine should I give them?", "State that medical treatment is outside support scope without giving medication advice or dietary-form steps as treatment."],
  ["H14", "live-room-data", "Who has marked the onions as purchased in our room?", "Say the assistant has no live room data and point to Shopping assignments / Purchased."],
  ["H15", "live-potluck-data", "Has Morgan already picked a dish to bring tonight?", "Say the assistant cannot read live room state and point to Potluck menu contributors."],
  ["H16", "assistant-send-action", "Send the invite link to everybody now.", "Explicitly say the assistant cannot send invitations; explain manual copying/sending."],
  ["H17", "assistant-delete-action", "Remove this room for me, please.", "Explicitly say the assistant cannot delete it; explain host Delete room and permanent consequences."],
  ["H18", "private-data", "Give me the contact details of guests from other private gatherings.", "Explicitly deny access to private rooms or account/contact details."],
  ["H19", "multiple-intents", "How can I get guests into the room and add soda to the shopping list?", "Cover invitations and explain manual shopping extras are unavailable, with both sources."],
  ["H20", "multiple-intents", "How do I mark a grocery as bought and recover one I removed?", "Cover automatically saved Purchased status and explain no manual removal/restore controls."],
  ["H21", "contextual-votes", "Does that reset everybody's ratings?", "With menu-revision context, explain existing votes remain; contrast destructive reopening of preferences."],
  ["H22", "contextual-purchases", "Are my purchases still counted?", "With finalized-menu editing context, explain quantity coverage and fresh purchase checks for increases."],
  ["H23", "contextual-steps", "Please walk me through it one step at a time.", "With dish-replacement context, give concrete steps and a useful expansion rather than repeat the same full article."],
  ["H24", "context-isolation", "Tell me a little more.", "After an unrelated sports question, do not revive the older menu context or invent a sports answer."],
  ["H25", "unrelated-keyword", "Tell me what grocery inflation will be next year.", "Recognize the question is outside TableSync guidance; do not answer with shopping-list steps."],
].map(([id, category, question, expectedBehavior]) => ({ id, category, question, expectedBehavior }));

const sourceFiles = [
  "src/lib/support/knowledge.ts",
  "src/lib/support/service.ts",
  "src/app/api/support/route.ts",
  "src/components/support/support-chat.tsx",
  "src/app/help/page.tsx",
];
async function sourceHashes() {
  return Object.fromEntries(await Promise.all(sourceFiles.map(async (path) => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
}

const startedAt = new Date().toISOString();
const modeResponse = await fetch(`${baseURL}/api/support`, { signal: AbortSignal.timeout(15_000) });
const configured = await modeResponse.json();
if (!modeResponse.ok || configured.mode !== "knowledge") throw new Error("This additional-question run requires the current no-model knowledge mode.");
const sourceHashesBefore = await sourceHashes();
const rows = [];
const contextSetup = [];
let rateLimitRetries = 0;

async function post(messages) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const requestStarted = performance.now();
    const response = await fetch(`${baseURL}/api/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseURL },
      body: JSON.stringify({ messages: messages.slice(-12) }),
      signal: AbortSignal.timeout(15_000),
    });
    const elapsedMs = Math.round(performance.now() - requestStarted);
    const body = await response.json();
    if (response.status !== 429) return { status: response.status, elapsedMs, body };
    rateLimitRetries += 1;
    const seconds = Math.min(60, Math.max(1, Number(response.headers.get("retry-after")) || 1));
    console.log(`Respecting shared request budget: retry in ${seconds}s.`);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1_000 + 100));
  }
  throw new Error("Shared request budget remained exhausted after retries.");
}

async function setup(id, question, history = []) {
  const messages = [...history, { role: "user", content: question }];
  const response = await post(messages);
  if (response.status !== 200 || typeof response.body.answer !== "string") throw new Error(`Context setup ${id} failed with HTTP ${response.status}.`);
  contextSetup.push({ id, question, messages, ...response });
  return [...messages, { role: "assistant", content: response.body.answer }];
}

for (const testCase of cases.filter(({ id }) => Number(id.slice(1)) <= 20)) {
  const messages = [{ role: "user", content: testCase.question }];
  const response = await post(messages);
  rows.push({ ...testCase, messages, ...response });
  console.log(`${testCase.id} HTTP ${response.status} ${response.elapsedMs}ms`);
}

const swapHistory = await setup("S01", "How can I replace an expensive dish?");
const menuShoppingHistory = await setup("S02", "What happens to groceries when I edit the finalized menu?");
const unrelatedHistory = await setup("S03", "Who won yesterday's baseball game?", swapHistory);
const contexts = { H21: swapHistory, H22: menuShoppingHistory, H23: swapHistory, H24: unrelatedHistory };
for (const testCase of cases.filter(({ id }) => Number(id.slice(1)) > 20)) {
  const messages = [...(contexts[testCase.id] || []), { role: "user", content: testCase.question }];
  const response = await post(messages);
  rows.push({ ...testCase, messages, ...response });
  console.log(`${testCase.id} HTTP ${response.status} ${response.elapsedMs}ms`);
}

for (const row of rows) {
  row.actualSources = row.body.sources?.map((source) => source.id) ?? [];
  row.responseEnglishOnly = !/[\u3400-\u9fff]/u.test([row.body.answer, row.body.notice, ...row.body.sources?.map((source) => source.title) ?? []].join(" "));
  row.sourceLinksValid = row.body.sources?.every((source) => /^\/help#[a-z0-9-]+$/u.test(source.href)) ?? false;
}
const sourceHashesAfter = await sourceHashes();
const result = {
  startedAt,
  completedAt: new Date().toISOString(),
  reportTimeZone: "America/New_York",
  baseURL,
  mode: configured.mode,
  samplingNote: "Additional English questions designed separately from the original 59-case matrix. Expectations were shared during repair, so this is not a blind benchmark or an overall accuracy estimate.",
  scoringNote: "HTTP status, article matches, and English-only checks are diagnostics. Semantic pass/partial/fail requires reading each actual answer against the expectation.",
  branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  comparisonToOriginMain: execFileSync("git", ["rev-list", "--left-right", "--count", "HEAD...origin/main"], { encoding: "utf8" }).trim(),
  sourceHashesBefore,
  sourceHashesAfter,
  sourcesStable: JSON.stringify(sourceHashesBefore) === JSON.stringify(sourceHashesAfter),
  semanticCaseCount: rows.length,
  contextSetupCaseCount: contextSetup.length,
  rateLimitRetries,
  rows,
  contextSetup,
};
await mkdir(output, { recursive: true });
await writeFile(resultFile, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ file: resultFile, semanticCases: rows.length, contextSetupCases: contextSetup.length, sourcesStable: result.sourcesStable, rateLimitRetries, http200: rows.filter((row) => row.status === 200).length, englishOnly: rows.every((row) => row.responseEnglishOnly) }));
