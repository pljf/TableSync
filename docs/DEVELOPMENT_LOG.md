# TableSync Development Log

## 2026-09-08 — Seven-format expansion accepted

- Documented the user-authorized Potluck, BBQ, Picnic, Brunch, and Other menu structures and acceptance contract in `EVENT_FORMAT_EXPANSION.md`.
- Defined Potluck whole-dish ownership, fixed servings, readiness, privacy, confirmed shopping rebuilds, and full-food-budget accounting.
- Inspected the existing dirty worktree and retained pre-existing changes. Verified the live local database with 150 TCP reset cycles and a final independent SQL health check; no application data changed.
- Implemented all seven room formats with explicit menu structures, suitable catalog dishes, role labels and practical preparation notes. Added 29 dishes and 12 ingredients while retaining Dinner/Hotpot constraints.
- Added persisted Potluck claim/assignment/release and readiness, fixed-serving recipe details, total/contributed/shared cost summaries, confirmed atomic shopping rebuilds, anonymous public progress, and undo/reopen cleanup.
- Fixed independent contribution-form draft preservation and tablet date-field stretching. All 81 added-format responsive screenshots are present and pass human review.
- Verified 228 unit tests, 31 database tests, production build/typecheck/lint, current 13 migrations, two idempotent seeds, and all 46 applicable browser cases across Chromium/Firefox/WebKit (5 intentional skips). Voting hydration and final button-feedback regressions pass in all three engines.
- Passed the unchanged median-of-three Lighthouse gate: Home 97, Auth 95, private finalized Potluck 93; all nine Accessibility/Best Practices scores 100 and CLS 0. Deferred unused authentication client loading and supplied missing favicon assets after the first benchmark missed the Home/Auth target. All 15 affected guest/interaction cases passed again. Failed reports, individual low samples and host-speed warnings are retained.
- Local acceptance is complete. The full evidence ledger records the PGlite cross-process query limitation and the boundaries of separate-connection testing; native PostgreSQL load testing and deployment remain separate work.

This file records completed work, important technical decisions, verification results, and upcoming milestones.

## September 7, 2026: UI redesign

- Reworked the welcome/authentication screens, shared navigation, dashboard, room overview, menu comparison, shopping, and forms with an ivory/olive/terracotta palette and original dinner-table illustration.
- Added active navigation, useful room summaries, a prominent next step, compact mobile menu details, and shopping progress derived from saved purchases.
- Three subagents supported implementation and visual review. Their final review caught and verified fixes for tablet banner crowding and mobile Hotpot status-label wrapping.
- Preserved the concurrent guest-access implementation and the earlier bug fixes, including unsaved vote/shopping drafts and retained shopping filters.
- The scoped changes, current validation evidence, and P1/P2/P3 remaining gaps are recorded in [UI_REDESIGN_2026_09_07.md](UI_REDESIGN_2026_09_07.md).

## August 1, 2026: Core-First Execution Direction

The project priority has been revised after a product grilling session. The active execution contract is now [`CORE_MVP_EXECUTION_PLAN.md`](CORE_MVP_EXECUTION_PLAN.md).

The immediate goal is to make the fresh-room Dinner and Hotpot workflows functionally correct, deeply tested, visually polished, accessible, performant, and repeatable before production authentication, deployment, realtime behavior, or portfolio packaging are prioritized. The new plan defines the confirmed menu safety, budget, event structure, state-machine, invalidation, evidence, and defect standards and must be maintained after every milestone.

### Phase 0 Baseline

Completed:

- Restored the configured local Prisma PostgreSQL development instance.
- Verified the migration and ran the idempotent seed twice.
- Passed Prisma validation, ESLint, full TypeScript checking, eight unit tests, two database integration tests, the production build, and the existing Chromium smoke test.
- Made standalone type checking independent of a stale incremental cache file.
- Changed the E2E runner to test the production build, call local Next and Playwright CLIs directly, and exit reliably on Windows.

Known baseline limitation:

- The existing Playwright test still browses only the seeded demo room and runs only Chromium. It does not satisfy the fresh-room Dinner and Hotpot acceptance requirement.

### First Safety and Dinner Generation Slice

Completed:

- Added a Prisma migration and seed support for dishes whose spice can be served separately.
- Separated global allergy blocking from guest-specific diet and spice safety.
- Added plan-level safe-main and safe-side coverage for every guest.
- Replaced the Dinner generator with a deterministic 1-2 main, 2 side, optional dessert, and 1 drink structure.
- Enforced guest coverage and the room budget before a Dinner candidate can be accepted.
- Added red-green unit coverage for mixed diets, plan coverage, optional spice, Dinner structure, and budget.
- Bounded and precomputed candidate evaluation after the first database regression exposed excessive repeated scoring.
- Batched persisted plans and menu items in the existing transaction.
- Verified lint, type checking, 12 unit tests, 2 database integration tests, the production build, the existing E2E smoke test, and a database-test rerun after E2E cleanup.

Remaining in this area:

- Add the dedicated Hotpot domain roles and generator.
- Replace the empty-dish no-plan placeholder with a first-class persisted conflict report.
- Add closest-over-budget reference behavior and adversarial safety fixtures.

## Current Status

TableSync is a working Next.js application with PostgreSQL persistence. The main dinner-planning workflow is implemented:

1. A host creates a dinner room.
2. Guests join and submit food preferences.
3. TableSync generates menu plans.
4. Guests vote on plans.
5. The host finalizes a plan.
6. TableSync generates and assigns a shopping list.
7. A finalized room can be shared publicly.

The core MVP acceptance gate is complete. The application still uses a demo host session; production authentication, deployment, and other deferred work remain outside the completed core scope.

## June 24, 2026

### Step 1: Verify the Existing Baseline

Completed:

- Confirmed `main` was synchronized with `origin/main`.
- Confirmed the working tree was initially clean.
- Resolved local access to stale generated Next.js output.
- Verified the production build.
- Verified the existing browser demo flow.

Verification:

- ESLint passed.
- TypeScript passed.
- Eight unit tests passed.
- Production build passed.
- Playwright browser smoke test passed.

No application code or configuration was changed during this step.

### Step 2: Add PostgreSQL Persistence

Completed:

- Replaced the in-memory workflow store with Prisma Client queries and transactions.
- Added the Prisma PostgreSQL driver adapter.
- Added a reusable Prisma Client instance.
- Converted server actions and page data reads to asynchronous database operations.
- Persisted:
  - Users
  - Dinner rooms
  - Guests
  - Preferences
  - Menu plans and dishes
  - Votes
  - Shopping items and assignments
  - Activity events
- Added an initial PostgreSQL migration.
- Added an idempotent database seed.
- Preserved the Friday Hotpot Night demo room.
- Added database setup and maintenance scripts.
- Added PostgreSQL-backed integration tests.
- Updated CI to provision PostgreSQL, apply migrations, seed data, and run database tests.
- Updated the README and environment-variable example.
- Added dependency overrides for patched transitive packages.

Technical decisions:

- PostgreSQL is the application’s persistent data source.
- Prisma transactions protect multi-record workflow updates.
- Generated Prisma Client files are created during installation and are not committed.
- The demo seed can be rerun safely.
- `DATABASE_POOL_MAX_USES` can retire connections after use when the experimental local Prisma server drops reused connections. Hosted PostgreSQL should normally leave this setting empty.
- Authentication remains a demo cookie until the authentication milestone.

Verification:

- Prisma schema validation passed.
- The initial migration applied successfully.
- The seed ran successfully more than once.
- Eight unit tests passed.
- Two database workflow tests passed.
- Playwright browser smoke test passed.
- ESLint passed.
- TypeScript passed.
- Production build passed.
- npm audit reported zero vulnerabilities.

Delivery:

- Branch: `feature/prisma-postgres-persistence`
- Pull request: `#2`
- Regenerated the cross-platform lockfile with npm 10.9.4 after the first CI run identified packages omitted by npm 11 on Windows.
- Validated the corrected lockfile with an npm 10.9.4 clean-install dry run.

### Core MVP correctness and workflow hardening (2026-08-01)

Completed:

- Established `docs/CORE_MVP_EXECUTION_PLAN.md` as the maintained core-first execution contract.
- Implemented strict Dinner and event-specific Hotpot generation with global allergy exclusion, per-guest coverage, spice adjustability, exact structures, and hard budgets.
- Added first-class persisted no-solution reports instead of invalid placeholder plans.
- Enforced the room workflow state machine, required Veto reasons, atomic destructive recovery, and deterministic shopping generation and assignment.
- Added fresh-room Dinner, Hotpot, and no-solution browser scenarios plus database and unit regressions.
- Added immediate pending and disabled feedback to critical mutation controls and made primary controls meet the 44-pixel target.

Verification recorded during this milestone:

- 27 unit tests passed across 3 files.
- 3 PostgreSQL-backed database tests passed.
- Production build passed.
- A full fresh-room Chromium run passed 4/4 before the subsequent interaction-race regression run; the harness and pending states were then corrected and await the final clean rerun.
- The experimental local Prisma proxy was cleanly restarted; all 6 migrations, the idempotent seed, and the database suite passed afterward.

Next acceptance risks:

- Guest preference editing and host ownership enforcement.
- Inline recoverable mutation errors and full double-submit protection.
- Required viewport screenshots, keyboard and automated accessibility review, browser matrix, and Lighthouse evidence.

### Core MVP final acceptance (2026-08-01)

Completed:

- Added private guest preference editing, join idempotency, host ownership checks, inline recoverable mutation errors, and double-submit protection.
- Completed fresh-room Dinner and Hotpot workflows with allergy, diet, spice, dislikes, hard budget, exact structures, Like/Neutral/Veto, finalization, manual shopping reassignment, purchase persistence, and destructive recovery.
- Added zero-error browser gates, Axe accessibility scans, keyboard/reduced-motion checks, overflow and touch-target assertions, and three required viewport captures.
- Upgraded Playwright to 1.62.1 and Lighthouse to 13.4.1 so the browser and audit toolchains match their current browser builds.

Final verification:

- `npx prisma validate`: passed.
- `npm run db:deploy`: 7 migrations present, none pending.
- `npm run db:seed`: passed twice consecutively.
- `npm run lint` and `npm run typecheck`: passed.
- `npm run test`: 28/28 tests passed across 3 files.
- `npm run test:db`: 3/3 PostgreSQL tests passed before and after the final browser matrix.
- `npm run build`: passed for all routes.
- `npm run test:e2e`: 15/15 passed across Chromium, Firefox, and WebKit.
- Responsive evidence: 36 screenshots covering 12 states at 375 x 812, 768 x 1024, and 1440 x 900.
- Accessibility: automated audited states reported zero Axe violations.
- Lighthouse mobile medians: Home Performance 91 / Accessibility 100 / Best Practices 100 / CLS 0; Demo 95 / 100 / 100 / 0.0548.

Recorded limitations:

- The experimental local Prisma proxy occasionally requires a clean named-server restart after repeated high-volume suites; the final E2E and post-E2E database checks passed in one clean session.
- npm reported 11 advisories across the full dependency tree, but the environment blocked a production-only audit because it would send dependency metadata to npm. Re-run that classification in explicitly authorized trusted CI before deployment.
- Lighthouse 13.4.1 officially requires Node 22.19 or newer; future evidence runs should upgrade the local/CI Node runtime.

### Production authentication, authorization, and staging-readiness hardening (2026-08-01)

Completed locally:

- Replaced the unsigned demo-host Cookie with Better Auth GitHub OAuth configuration, Prisma-backed sessions/accounts, logout/revocation, fail-closed production routing, and a random-key CI-local identity that cannot run on a managed host.
- Replaced plaintext guest edit tokens and token-bearing URLs with hashed, revocable HttpOnly guest sessions and tokenless preference routes.
- Centralized typed, deny-by-default host/guest authorization at data and transaction boundaries; added minimum invite/public/member DTOs and blocked anonymous private reads, wrong-host/wrong-room IDs, guest impersonation, and client-selected voting/shopping identities.
- Added transaction locks, PostgreSQL advisory locks, idempotent join/session issuance, and deterministic concurrency tests for joins, votes, finalization, shopping claims, and purchases.
- Added database-backed shared rate limiting, redacted security audit events, bounded inputs, security headers, same-origin Server Action enforcement, repository/history secret scanning, and evidence redaction.
- Added ten total Prisma migrations, pooled/direct managed database configuration, staging-only TLS and distinct-role enforcement, live role/privilege verification, migration-aware `/api/health`, bounded connection recycling, and operational-data retention tooling.
- Added `docs/STAGING_OPERATIONS_RUNBOOK.md`, a restore/rollback contract, `docs/STAGING_ACCEPTANCE_REPORT.md`, and a protected manual GitHub Actions staging gate. Remote browser and Lighthouse paths explicitly reject localhost, reject the local test-auth bypass, and require health metadata to match the reviewed deployment ID, commit SHA, and migration head.

Latest verified provider-independent evidence:

- `npx prisma validate`, Prisma format/generate, all 10 migrations, migrate status, and idempotent seed twice: passed locally.
- `npm run lint` and `npm run typecheck`: passed.
- `npm run test`: 37/37 passed across 5 files.
- `npm run test:db`: 8/8 passed across 4 PostgreSQL-backed files.
- `npm run build`: final post-health production build passed with 14 routes, including dynamic `/api/health`.
- Current local browser inventory is 21 project cases: 16 locally applicable scenarios and 5 intentional skips (three remote-health cases and two non-Chromium protocol duplicates). Chromium and Firefox applicable scenarios passed in the full run; WebKit Dinner, no-solution, public quality, and demo passed in the full run, and the final Hotpot navigation fix passed 1/1 in an isolated rerun with successful database cleanup and exit code 0.
- Responsive/accessibility evidence: 36 screenshots across 375 x 812, 768 x 1024, and 1440 x 900; zero Axe violations on audited states.
- Local Lighthouse three-run medians: Home Performance 92 / Accessibility 100 / Best Practices 100 / CLS 0; Demo 94 / 100 / 100 / 0.0548035.
- `npm run security:secrets`: passed across tracked, untracked nonignored, and reachable Git history files.

Open, non-waived acceptance gates:

- The production-only npm audit could not run in the managed sandbox because it sends dependency metadata to npm's public audit service. Explicit informed authorization or trusted CI execution is required; no vulnerability result is claimed.
- Real GitHub OAuth credentials/domain are required for callback denial, success, persistence, logout, and revocation evidence.
- Managed PostgreSQL and hosting access are required for TLS/role proof, fresh and upgrade migrations, backup/restore RPO/RTO rehearsal, a real HTTPS deployment, log inspection, rollback, and the full remote matrix.
- No local proxy, configuration template, workflow file, or mock page is accepted as evidence for those external gates.
- The experimental local Prisma proxy dropped its connection during cleanup after one five-minute combined browser run. A clean restart produced a passing WebKit Hotpot scenario and successful cleanup; this local-proxy limitation is not accepted as managed staging evidence and is one reason Phase 4 requires a real PostgreSQL service.

Follow-up hardening evidence:

- Added automated `/api/health` proof for the exact reviewed migration head, stale migration rejection, and database failure. Failure responses and logs exclude the original database error details.
- Added recoverable GitHub sign-in initiation and sign-out error states. OAuth callback rejection renders a generic retry path and ignores an attacker-controlled callback URL.
- Authentication error recovery and Axe checks passed in Chromium, Firefox, and WebKit; the sign-out failure path and existing cross-origin Server Action denial passed in Chromium.

### External staging blocker audit (2026-08-02)

After three consecutive requests for the minimum external decision, no provider selection or authorization was supplied. Read-only inspection confirmed:

- no Vercel, Neon, Supabase, GitHub OAuth, or TableSync deployment variables are available to this workspace process;
- no `vercel`, `neonctl`, or `gh` command is installed/connected and no provider connector is callable;
- Git remains on dirty local `main` at `bbea289184127e3a321775abc82083af529cce12`; no branch, commit, push, deployment, or remote mutation was performed;
- `docs/STAGING_ACCEPTANCE_REPORT.md` remains not executed, with no staging URL, deployment ID, managed database role/TLS proof, backup restore, real OAuth callback, remote browser matrix, staging Lighthouse, log review, or rollback evidence;
- production dependency classification remains unavailable because authorization to send dependency package/version metadata to npm was not provided.

Minimum resume input: select/connect a hosting and managed PostgreSQL provider (recommended direction remains Vercel + Neon, or an equivalent existing stack), authorize the npm audit metadata request, and authorize creation/push of a review branch. Secrets must be placed directly in provider/GitHub protected stores, never in chat or repository files.

### Production staging work resumed (2026-09-02)

- Repeated the complete provider-independent candidate gate before source-control fixation: secret scan passed across 123 tracked/untracked/history files, evidence redaction passed across 44 files, lint and typecheck passed, 37/37 unit tests passed, and the production build passed with all 14 expected routes.
- Restarted the isolated local Prisma PostgreSQL instance and repeated the database gate: Prisma validation passed, all 10 migrations were current, the seed completed twice, migrate status was clean, and 8/8 database tests passed.
- `git diff --check` reported no whitespace error; only the existing Windows LF/CRLF conversion notices remain.
- Created the local `codex/production-staging` candidate branch. No push, cloud resource creation, OAuth registration, production dependency audit, or staging evidence has been claimed.
- Plugin discovery found no currently callable GitHub, Neon, or Vercel connection. Those external connections and approval to transmit dependency metadata to npm remain the next gates.
- Pushed `f78c8fb` on `codex/production-staging`; the local branch and `origin/codex/production-staging` matched exactly after the push.
- Automatic installation suggestions for the catalog GitHub, Vercel, and Neon Postgres plugins were rejected by the current plugin directory despite using the supplied exact identifiers. No plugin is claimed installed.
- Opened the official GitHub developer settings, Vercel dashboard, and Neon console login pages as user handoffs. All three require interactive user sign-in; no password, one-time code, token, or account data was entered or inspected.
- The production audit remains unexecuted because the execution policy requires a second, specific confirmation that production package names and versions may be sent to the public npm audit service. No audit payload was transmitted.

### Product function and interaction audit (2026-09-02)

- Audited the confirmed Dinner and Hotpot core workflow route by route and recorded the result in `docs/PRODUCT_FUNCTIONAL_AUDIT.md`.
- Fixed premature public-share navigation, misleading empty/count states, room-section navigation drift, hidden current-vote state, stale non-Veto reasons, unrecoverable room-creation validation, and missing shopping filters and assignment totals.
- Improved candidate quality so top menu recommendations differ by core meal composition instead of only by drink, and added descriptive Hotpot titles.
- Added regression coverage for fresh-room display states, finalized navigation, vote feedback, shopping filters, room validation, and concurrent non-Veto normalization.
- Final local evidence: Prisma validation, lint, typecheck, 47/47 unit tests, 8/8 PostgreSQL tests, 14-route production build, and 16 passing/5 intentionally skipped production-browser scenarios.
- Recovered the experimental named Prisma development server without resetting data after it became unhealthy following prolonged multi-browser load; this remains a local tooling limitation, not managed-staging connection evidence.

### Review and repair (2026-09-07)

- Preserved the existing September 2 working changes and independently reviewed workflows, domain engines, authentication/deployment boundaries, routes, and forms.
- Closed verified consistency, privacy, allergy-matching, portion/cost, date/time, preference clearing, Veto, shopping-ownership, and navigation defects.
- Added host room editing during collection/planning, including recovery from an insufficient room budget without losing guest responses.
- Recorded the prioritized fixed/missing inventory and final verification ledger in `docs/REVIEW_2026_09_07.md`; earlier pass claims remain historical evidence.
- Initial review checks: 79/79 unit tests and 13/13 PostgreSQL integration tests passed. Production build and typechecking passed with the new edit route. Browser/evidence results are maintained in the review ledger.
- Production acceptance, full dietary certification metadata, multi-guest session management, and guest spending caps remain open. No deployment, commit, or push was performed in this review.

### Independent follow-up review (2026-09-07)

- Added two independent subagent reviews of menu/shopping/date logic and state/authorization boundaries; no additional confirmed authorization bypass was found.
- Fixed qualified allergy matching (including sesame seeds and milk allergy), cross-form draft loss and shopping-filter resets after saves, and outdated failed-generation guidance after guest inputs change.
- Successful mutations refresh dynamic data and client navigation state; submitted Like/Neutral votes clear their own Veto reason while unrelated drafts survive. Removed duplicate preference-save feedback exposed by client navigation.
- Reproduced the draft-loss regression against the previous production build before repairing it. Added browser assertions for unfinished vote/shopping changes and retained filters.
- Expanded local checks passed: 86/86 unit tests and 14/14 PostgreSQL integration tests. Final browser/build/evidence results are recorded in `docs/REVIEW_2026_09_07.md`.

## Local Development

Project directory:

```text
C:\Project\TableSync
```

Common commands:

```bash
npm install
npm run db:dev
npm run db:deploy
npm run db:seed
npm run dev
```

Verification commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:db
npm run build
npm run test:e2e
```

## Remaining Milestones

1. Complete real-provider authentication acceptance and repeat authorization verification remotely; the implementation already exists locally.
2. Deploy the application against managed PostgreSQL, rehearse recovery, and repeat the acceptance gate there.
3. Consider realtime updates or polling after production identity and deployment are stable.
4. Consider AI, payments, or portfolio packaging only after an explicit product decision. The separately authorized seven meal formats are now implemented.

## Working Agreement

Complete one milestone at a time. After each milestone:

1. Verify the implementation.
2. Record the result in this file.
3. List the remaining milestones.
4. Discuss the next milestone before starting it.

## September 8, 2026 — Guest access and demo retirement

- Replaced the shared demo entry with per-browser guest host accounts using Better Auth anonymous sessions. GitHub configuration is optional for this flow; existing ownership checks still scope rooms to their host.
- Added the eleventh migration for `User.isAnonymous`, applied it locally, and configured a stable local session secret so restarts do not invalidate browser access.
- Retired `/demo` to the entry page, removed the public-demo room authorization exception, changed seeding to catalog only, and removed the verified legacy demo room while retaining the catalog and host account.
- Added clear self-participation guidance, a missing-preference-session recovery screen, a planned-headcount shopping estimate, and confirmation before ending an unrecoverable guest session. Ending the host session also revokes and clears the active meal-response session.
- Preserved concurrent UI work from the separate review task. Current automated results and final browser evidence are recorded in `docs/GUEST_ACCESS_REVIEW.md`; production OAuth/deployment acceptance remains separate.

## September 8, 2026 — Button feedback and integrated full-stack review

- Added pointer and keyboard press feedback, short ripples, stable loading labels, visible focus, accessible pending/success/error messages, duplicate-submission guards, recoverable forms, and reduced-motion support. Shopping completion reflects confirmed saved purchases.
- Repaired persistent logout revocation and expired/revoked guest-join replay. Browser tests cover privacy, real cross-site request rejection, retries, retained drafts, and inaccessible private rooms after logout.
- Repaired the local database socket lifecycle leak with a version-guarded project launcher; 150 actual abruptly disconnected clients and a subsequent SQL query passed without resetting saved data or increasing connection limits.
- Updated vulnerable dependencies; both full and production npm audits report zero vulnerabilities. Corrected tofu's catalog category through a guarded data migration.
- Coordinated the separately requested seven-format expansion into one final build and acceptance gate. Independent review caught and repaired Potluck draft loss and missing preparation guidance.
- Corrected local setup and audit defaults, authenticated/public audit separation, final-page attribution, owned-process cleanup, and transient-session evidence scanning.
- Closed early voting-input and Safari cancelled-key feedback gaps. Deferred authentication client loading until an account action and added browser icons after inspecting the performance reports.
- The authoritative final results and local/hosted release boundary are maintained in `docs/INTERACTION_FULL_STACK_REVIEW_2026_09_08.md`. Historical entries above remain historical evidence.

## September 8, 2026 — Simple party-planning follow-up

- Completed the five-item usability goal on `codex/simple-party-planning`, building on PR #4's guest access, grocery reconciliation, automatic updates, and selected-menu layout.
- Added distinctive comparison labels, joined-guest voting progress, optional waiting-name details, and a short explanation of suggestions.
- Added **Prepare this menu** for every meal format: expandable dishes, finalized portions, scaled ingredient estimates, prep-time estimates, spice adjustments, and contribution context. Cooking quantities and recipe steps are explicitly distinguished from shopping estimates.
- Repaired update acknowledgement/retry, canceled native-form drafts, clean vote-note refreshes, and full-document navigation lifecycle. Saved preference inputs wait for their form to be ready before accepting edits, addressing the Safari input race found in the base PR's CI logs.
- Before submission: 353 unit tests, 32 database tests, and 22 Chromium browser tests passed; the remote HTTPS health check was skipped locally. Build/TypeScript, lint, source/history secret scanning, responsive accessibility checks, and independent source/visual review completed. Final additional browser and GitHub check outcomes are recorded in the PR.
- The detailed acceptance record and screenshots are in `docs/SIMPLE_PARTY_PLANNING_2026_09_08.md`. Deployment and real GitHub OAuth callback acceptance remain owner-managed; this task does not merge the PR chain or deploy the application.
