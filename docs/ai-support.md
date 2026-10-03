# TableSync support assistant

The English `/help` page and **Ask TableSync** widget answer questions about invitations, meal planning, voting, shopping responsibilities, sharing, and room retention. The knowledge index is maintained against `docs/user-guide.md` and the current implementations. No training or fine-tuning is involved.

## Current product guidance

The assistant targets the features on this branch. Shopping assignments and Purchased changes save automatically; wait for confirmation and use Retry save after a failure. Revise menu reopens voting while keeping the current shopping list visible and pausing shopping/contribution updates. Re-finalizing reconciles matching ingredients and quantity coverage. Reopening guest preferences is a separate destructive reset.

Room expiry is seven days after creation or three days after the scheduled gathering, whichever is later. Anonymous host sessions still belong to their browser; GitHub linking, when configured, enables cross-device host access without extending room retention.

Individual dish/serving editing, custom recipe entry, manually adding/removing/restoring groceries, and reusable menu templates are not available in this version. Questions about these features receive an explicit limitation and existing alternatives. The assistant does not describe controls from unpublished local experiments.

Try **How do I invite friends?**, **Will changing the menu update my shopping list?**, and **What about items already bought?** Natural English variants and specific follow-ups are supported by deterministic intent rules. Compound tasks can return multiple concise answers and reviewed help links. Unrelated user questions end the prior topic; assistant messages cannot establish product facts.

## Knowledge mode and optional model

Without `OPENAI_API_KEY`, the assistant runs entirely from the local guide. Its UI and responses label knowledge mode. It asks for context when guidance is missing and explicitly states that it cannot send invitations, delete rooms, read live room/private account data, provide medical treatment, or confirm undocumented exports/automatic messaging.

An optional server-only Responses integration is included. Set `OPENAI_API_KEY` only in the server environment; `TABLESYNC_SUPPORT_MODEL` overrides the default `gpt-5.4-mini`. Never use a `NEXT_PUBLIC_` key or enter credentials in the chat. Configured AI mode means a key is present, not that provider availability or answer quality has been verified.

Only questions with matching reviewed guidance can contact the provider. Requests include at most 12 messages of 2,000 characters each and three guide articles. Messages are untrusted; model instructions require English answers grounded in those articles. No tools or database access are provided. Links always come from the local index. Boundary replies remain deterministic even with a configured key.

The provider receives recent conversation text. `store: false` disables Responses application-state storage; this does not promise that the provider retains no data. This feature does not persist chats in the application database or log chat text/provider errors. Timeout, failure, empty/incomplete/oversized output, and model-supplied links fall back to the guide with a visible notice.

Real-provider quality, latency, and cost were not tested. Optional AI should receive a separate evaluation before activation.

## API limits

- `GET /api/support` returns the configured `knowledge` or `ai` mode without contacting the provider.
- `POST /api/support` accepts user/assistant messages ending with a user question; replies include `answer`, `mode`, reviewed `sources`, and an optional notice. Errors have an `error` field.
- Requests require JSON, a same-origin browser context, and no more than 100,000 actual UTF-8 bytes. Responses are not cached.
- A fixed process-wide budget accepts at most 60 requests per minute. It is shared by all visitors and does not grow with untrusted IP headers. Three provider calls can run concurrently; each has a 15-second timeout and 1,200-token output limit.
- Process-local limits reset at restart and do not coordinate across instances. Before enabling a paid provider publicly, add centralized traffic and provider-spending limits.

## Verification

Run `node node_modules/vitest/vitest.mjs run tests/unit/support-api.test.ts tests/unit/support-knowledge.test.ts tests/unit/support-responses.test.ts --configLoader runner` for retrieval, semantic and API regressions. All provider calls in these tests are mocked.

The Chromium support browser suite checks questions/follow-ups, source expansion, new conversations, recovery after network failure, compound replies, action boundaries, focus restoration, phone layout and axe accessibility. Use a production build for the repository's strict CSP.

For actual knowledge-mode capture, set `TABLESYNC_SUPPORT_BASE_URL` to the target server and pass a fresh evidence directory to `scripts/test-support-capabilities.mjs` and `scripts/test-support-heldout.mjs`. Both refuse to overwrite existing result files and abort if the endpoint is not in knowledge mode. Review full answers against the current feature contract; HTTP success and article matching do not imply semantic correctness.

The [2026-10-02 PR verification report (Chinese)](evidence/support-pr-verification-2026-10-02.zh-CN.md) includes captured answers, independent per-case assessments, and local verification limitations.
