# Interaction and full-stack completion review — September 8, 2026

## Requested outcome

Polish buttons and animation, give users strong and accurate interaction feedback, and inspect and repair the complete existing full-stack product. The initial contract was the fresh-room Dinner/Hotpot workflow and browser guest hosting. During final review, the separately authorized seven-format expansion in `EVENT_FORMAT_EXPANSION.md` added Potluck, BBQ, Picnic, Brunch, and Other. The shared final gate includes that integrated source. This review does not treat the older demo or historical passing test counts as evidence for the current build.

## Changes

- Shared action styling adds a brief pressed response, hover elevation, visible keyboard focus, and a short ripple from the pointer position or the center for keyboard activation. Effects do not delay requests or stand in for saved-state confirmation. Reduced-motion preferences disable animations and movement. No animation dependency was added.
- Buttons reserve space for normal and loading labels. Only the selected vote becomes busy, while competing submits are disabled. Pending messages, confirmed results, and retryable errors are announced accessibly.
- Forms reject immediate duplicate submissions, preserve input after failures, hide obsolete success messages when editing resumes, and focus relevant errors without interrupting someone editing another field.
- Guest entry, GitHub entry, copying an invitation, and ending a session use the shared feedback. The guest-session confirmation opens on the safe action and supports Escape and focus restoration. Copy failures leave the link selected for manual copying.
- Account buttons load the authentication client only when used, after displaying their pending feedback. A matching SVG icon and compact multi-size ICO fallback replace the missing browser icon.
- Shopping distinguishes unsaved edits from saved values, retains unrelated drafts during refresh, announces filter results, and displays completion only when every persisted item is purchased.
- Logout requires persistent host-session revocation before reporting success. An old join submission cannot restore an expired or revoked participant session; valid retries still recover an active response without extending its expiry.
- Dietary guidance now explains the limits of catalog ingredient/tag matching and the need to confirm labels, preparation, cross-contact, and Halal/Kosher requirements.
- The evidence-redaction command loads local environment values so its value checks also apply when invoked directly during local review.
- A project-owned local database launcher preserves the existing named database and repairs a socket-close lifecycle defect in the pinned development runtime. It does not modify installed dependency files or reset saved data. Its version guard requires explicit review on a runtime upgrade.
- Tofu is categorized as Produce instead of Dairy. The guarded data migration changes only that incorrect catalog field; it preserves ingredient links and shopping progress.

## Independent review

Three subagents implemented/reviewed client interactions, reviewed backend authorization and persistence, and independently reviewed frontend semantics and acceptance coverage. The reviewers found the two session defects above, a missing public-share browser regression, live-status suppression from busy ancestors, feedback hidden behind the guest confirmation, and an error-focus scrolling issue. These were repaired before final verification.

## Verification ledger

The final source passes **228 unit tests across 18 files, all 31 database integration tests across 5 files, lint, TypeScript, schema validation, and the production build** under Node 24.19.0. The final database run completed in 21.9 seconds and includes an independent-connection Potluck ownership check. All thirteen migrations are applied. The expanded catalog seed completed twice.

The browser inventory is **51 cases: 46 applicable passes and 5 intentional skips**, verified in attributed focused batches across Chromium, Firefox, and WebKit. All seven fresh meal workflows pass. The three remote HTTPS health checks require a deployed environment; the two non-Chromium protocol-suite instances are intentionally excluded by that suite's browser scope. Following their respective application fixes, the vote-hydration and independent-draft workflow passed in all three engines, and all six final button-feedback cases passed in 17.4 seconds. The final source also passed the complete 228-test unit suite and lint; these results supplement the unchanged domain, persistence, and responsive evidence rather than claiming a single uninterrupted browser run.

After deferring the authentication client and adding browser icons, the final production build, complete unit suite, and lint passed again. All **15 guest-access and interaction cases across the three browsers** passed in 2.6 minutes, including first-use loading, session security, retry, logout, full guest planning, cancelled keyboard activation, and reduced motion. The WebKit flow honored the server-requested cooldown instead of bypassing the real sign-in rate limit.

One earlier database run had a 30-second timeout while the production build competed for resources; the other 29 cases passed. The isolated complete rerun passed all 30 in 44.9 seconds without changing any timeout or restarting the database. After adding the independent-connection case, all 31 passed in isolation. Local PGlite queues transactions, so this case verifies the application waits and rechecks committed ownership, but does not substitute for a multi-backend managed PostgreSQL load test.

The final nine-run Lighthouse gate passes with unchanged mobile throttling and thresholds. Every individual run has **Accessibility 100, Best Practices 100, CLS 0, and no browser-console errors**. Raw reports and the summary are in `docs/evidence/lighthouse/local/`.

| Page | Performance runs | Performance median |
| --- | --- | --- |
| Public Home | 75, 97, 97 | **97** |
| Public guest entry | 96, 95, 93 | **95** |
| Private finalized Potluck | 82, 94, 93 | **93** |

Deferring the authentication client removes one initial script request, about 12.7 KB of transferred JavaScript and 32 KB of decoded JavaScript per page. All nine corresponding before/after reports confirm that reduction. Five final reports still flag slow host CPU speed; the first-run outliers above are retained. These are three-run local medians, not guarantees for an untested hosted environment.

The first integrated measurement missed Performance 90 on Home and Auth, both with a median of 89; private Potluck scored 90. Its full reports remain in `docs/evidence/lighthouse/local-before-auth-defer/`. Server responses were 10–49 ms, while long-task variance affected scores. The report also caught a missing favicon. The final optimization addresses actual initial-load work and that missing asset; no score threshold or Lighthouse setting was weakened.

Final evidence redaction passed across 163 files, including a check against the actual temporary audit-session credential before it was discarded. The audit removed only its uniquely marked room and anonymous account, stopped its own servers/browser, and preserved the user's guest account and saved data. The source/history secret scan passed across 202 tracked/untracked source files and reachable Git history; the repository whitespace check also passes. The normal local preview is running at `http://localhost:3000`; the existing guest dashboard was reopened successfully after the final build.

An initial database run was interrupted by the experimental local Prisma runtime exhausting connection slots. Investigation reproduced a phantom-connection leak in `@electric-sql/pglite-socket` 0.1.3: error cleanup removed the socket close listener without releasing the server's tracked handler. The project launcher supplies the missing close notification only after transaction cleanup succeeds, while deduplicating raced close callbacks. Seven regression tests and **150 actual TCP reset cycles followed by an independent SQL query** pass. Subsequent isolated workflow batches completed without exhausting connection slots or restarting the database. Existing data and connection limits were preserved. An earlier Windows access error opening `.next/trace` was resolved by running the build with access to those existing generated files.

A later overlapping preview and WebKit run produced `08P01` from unnamed prepared-statement interference across two connections. Inspection of the pinned socket source matches [upstream issue #1046](https://github.com/electric-sql/pglite/issues/1046), separately from the repaired close lifecycle. The [official PGlite Socket documentation](https://pglite.dev/docs/pglite-socket) describes its single-connection multiplexer limitation. Local gates therefore require one active database-using app or test process at a time, with other previews idle; a pool size of one per process does not provide that isolation. The 150-reset result remains lifecycle evidence only. Production and multi-process concurrency acceptance require real PostgreSQL.

An independent cookie-free production diagnostic observed four App Router navigations briefly remove the document title for approximately 0–12 ms before restoring it. The Dinner test explicitly requires the destination URL, heading, and actual document title before running Axe; no accessibility rule was disabled. Axe also caught transient low text contrast while complete menu cards faded in. Entrance effects now move fully opaque content, retaining readable text throughout the animation.

Keyboard activation now has an explicit decorative pressed state while retaining native Space/Enter behavior and clearing it on release or cancelled focus. WebKit retained native `:active` after a cancelled Space press; a per-control keyboard marker now prevents that stale appearance, and pointer input restores native pointer feedback. Browser checks require return to the settled idle appearance, real pressed feedback, cancellation without submission, and both motion preferences. A full-page screenshot artifact from unfinished native Space scrolling was resolved by waiting for stable viewport positioning; the skip link itself remained correctly hidden and unfocused.

Voting inputs and buttons remain disabled in server-rendered markup until their controlled handlers hydrate, closing a confirmed early-input gap. Tests verify disabled server markup, enabled client controls, and preservation of an unsaved Veto explanation when another plan is voted on. Guest cookie checks verify the real `Set-Cookie` attributes on every browser. Native Windows WebKit's incorrect Lax metadata is a [known Playwright limitation](https://github.com/microsoft/playwright/blob/main/tests/library/browsercontext-cookies.spec.ts#L122); only that unsupported metadata assertion is omitted there. Actual Lax/HttpOnly flags, JavaScript inaccessibility, and real cross-site form rejection remain required. Guest acceptance honors one valid server-specified rate-limit cooldown while still requiring the error feedback, no issued session, and a successful secured retry.

The audit runners now use the correct HTTPS cookie name, audit public Home/Auth before authenticating, verify the actual final page, reject occupied local ports, and clean up their own browser processes. Current workflow migration defaults and local pool settings match this build. A private local core audit accepts an explicitly paired path/session value; its temporary token is included in evidence-redaction checks.

## Dependency remediation

The initial production audit reported thirteen vulnerabilities; a broader audit subsequently found three affected development dependency families. Both production and complete development/production audits now report **zero vulnerabilities**. Next and its ESLint configuration were updated to 16.3.4, the Prisma packages to 7.10.0, and affected transitive packages to patched versions. The lockfile preserves the resolved dependency tree. No forced Prisma downgrade or application schema migration was used.

Compatibility was checked against the [Next security release](https://nextjs.org/blog/august-2026-security-release) and [Prisma 7.10 release](https://github.com/prisma/orm/releases/tag/7.10.0). The scoped `@prisma/config` override to `deepmerge-ts` 8.0.2 is the only major transitive override; its [documented breaking changes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0) concern Map handling, type aliases, and deepmergeInto, while this project's Prisma configuration uses plain-object merging. Prisma generation, configuration validation, database integration tests, and production build all pass with it. Other overrides preserve compatible package lines. The package manifest now declares Node 22.19+ in the 22.x line or Node 24+, matching the performance tooling requirement.

| Requirement | Authoritative acceptance evidence |
| --- | --- |
| Visible keyboard, pressed, pending, error, and reduced-motion feedback | Production-browser `interaction-feedback.spec.ts`, including computed styles and held requests |
| Guest privacy, real workflow, retry, logout, mobile vote stability, and public-share privacy | Production-browser `guest-access.spec.ts` |
| All seven meal formats, no-solution recovery, edits, state changes, shopping, contributions, sharing, and draft preservation | Fresh-room, room-flow, and public/protocol browser suites |
| Authorization, validation, domain rules, atomic persistence, session replay, and revocation | Full unit and PostgreSQL integration suites |
| Responsive layout, accessibility, and visual quality | Axe, overflow/touch-target checks, and inspected screenshots |
| Application/schema compatibility | Lint, TypeScript, Prisma validation/status, and final production build |
| Dependency security and redacted evidence | Production dependency audit, secret scan, and evidence scan |
| Performance remains suitable after animation | Three-run local Lighthouse medians against the final production build |

## Release boundary

This is a local full-stack product review. Real GitHub OAuth credentials, an HTTPS deployment, managed PostgreSQL recovery/TLS/roles, and remote rollback/acceptance evidence remain required before a production-release claim. Those external services are not configured here. Broader roadmap items such as payments, live pricing, participant recovery across devices, and room lifecycle features are not silently presented as implemented. Guest hosting remains available without those services. The seven meal formats are tracked by their separate expansion contract and included in the integrated local acceptance gate.
