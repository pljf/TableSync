# TableSync Development Log

This file records completed work, important technical decisions, verification results, and upcoming milestones.

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

1. Run a production-only dependency audit in an explicitly authorized environment and resolve applicable findings.
2. Add production authentication and complete production authorization.
3. Deploy the application against managed PostgreSQL and repeat the acceptance gate there.
4. Consider realtime updates or polling after production identity and deployment are stable.
5. Add extra event types, AI, payments, or portfolio packaging only after an explicit product decision.

## Working Agreement

Complete one milestone at a time. After each milestone:

1. Verify the implementation.
2. Record the result in this file.
3. List the remaining milestones.
4. Discuss the next milestone before starting it.
