# TableSync

TableSync helps groups plan shared meals. A host creates a room, guests share food preferences, and the group compares and votes on complete menus. The finalized plan becomes an assigned shopping list; Potluck guests can also claim whole dishes and track their readiness.

The core-MVP acceptance contract is maintained in [`docs/CORE_MVP_EXECUTION_PLAN.md`](docs/CORE_MVP_EXECUTION_PLAN.md). Current guest access and the accompanying usability repairs are recorded in [`docs/GUEST_ACCESS_REVIEW.md`](docs/GUEST_ACCESS_REVIEW.md). The earlier prioritized review is preserved in [`docs/REVIEW_2026_09_07.md`](docs/REVIEW_2026_09_07.md), alongside the route-by-route audit in [`docs/PRODUCT_FUNCTIONAL_AUDIT.md`](docs/PRODUCT_FUNCTIONAL_AUDIT.md). The active production-readiness goal, permission matrix, threat model, phases, and evidence ledger are maintained in [`docs/PRODUCTION_READINESS_PLAN.md`](docs/PRODUCTION_READINESS_PLAN.md). Development progress and technical decisions are recorded in [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md).

## Current Build

Deployment preparation and current verification results are recorded in [`docs/DEPLOYMENT_READINESS_2026_09_09.md`](docs/DEPLOYMENT_READINESS_2026_09_09.md). The repository now provides separate [hosting runtime settings](docs/deployment/runtime.env.example) and [protected acceptance-job settings](docs/deployment/acceptance.env.example). Store real values in the hosting/CI secret stores. Guest-only hosting is supported; configure both GitHub credentials only when offering GitHub sign-in.

The simple party-planning follow-up is recorded in [`docs/SIMPLE_PARTY_PLANNING_2026_09_08.md`](docs/SIMPLE_PARTY_PLANNING_2026_09_08.md). It completes menu comparison and preparation, protects saved preference input while the form becomes ready, and improves shared-update recovery. Before PR submission, 353 unit tests, 32 database tests, and the full 22-test Chromium acceptance suite passed. The preceding collaboration implementation is recorded in [`docs/COLLABORATION_RELIABILITY_2026_09_08.md`](docs/COLLABORATION_RELIABILITY_2026_09_08.md). Hosted deployment and real GitHub OAuth callback acceptance remain separate owner-managed checks. Earlier button, animation, security, and full-stack evidence remains in [`docs/INTERACTION_FULL_STACK_REVIEW_2026_09_08.md`](docs/INTERACTION_FULL_STACK_REVIEW_2026_09_08.md).

This repository supports Dinner, Hotpot, Potluck, BBQ, Picnic, Brunch, and shared-buffet Other gatherings, with guest access and production-readiness safeguards. Choose **Continue as guest** to create your own rooms and try the full planning workflow without a GitHub login. Guest access creates a unique account for this browser with normal room ownership permissions. The expanded meal-format contract and its acceptance record are in [`docs/EVENT_FORMAT_EXPANSION.md`](docs/EVENT_FORMAT_EXPANSION.md).

- Better Auth guest accounts and optional GitHub OAuth with database-backed, revocable host sessions
- Unique browser guest accounts with private rooms, full host controls, and **Save my rooms** through GitHub when OAuth is configured
- Strictly isolated CI-local test identity for automated tests
- Deny-by-default host/guest authorization and tokenless hashed guest sessions
- Room creation collects the creator's meal preferences and saves them as a participant alongside the room
- Creators can permanently delete their rooms; rooms expire seven days after creation and are automatically cleaned up
- Guest join form and a separate saved meal response for each room in the same browser
- Constraint summary for diets, allergies, likes, budget, and spice
- Deterministic menus with distinct structures for all seven meal formats
- Menu comparison with actual dish and portion differences, total/per-person estimates, and Like, Neutral, and required-reason Veto controls
- Visible room pages check for changes every eight seconds while preserving unsaved form drafts
- Tactile button feedback, accessible loading/results, retryable errors, and reduced-motion effects
- A focused finalized menu, with other options collapsed for reference
- Expandable preparation details for every meal format, using finalized portions, ingredient estimates, per-dish time, and adjustment notes
- Shopping list generation, assignment, and purchased state
- Potluck dish contributions, readiness, and shared groceries that preserve unaffected assignments and purchase checks when contributions change
- Public read-only share page
- PostgreSQL persistence through Prisma Client
- Idempotent ingredient and dish catalog seed; no shared demo account or room is created
- Thirteen versioned Prisma migrations, including anonymous hosts, Potluck contributions, and the tofu category correction
- Unit and PostgreSQL integration tests for domain, auth, permissions, health/deployment boundaries, concurrency, rate limiting, presentation ordering, and audit behavior
- Production-build Playwright scenarios across Chromium, Firefox, and WebKit
- Automated Axe, responsive screenshot, touch-target, and Lighthouse quality gates
- Managed-database TLS/role validation, attributable health checks, and a protected remote staging acceptance workflow

All application, authentication, guest-session, rate-limit, and security-audit data is stored in PostgreSQL. The September reviews added collection-stage room editing, budget recovery, timezone handling, visible Veto/guest notes, working invite copying, stronger transaction consistency, corrected menu/shopping logic, and consistent action feedback. The current collaboration update retains the original green-and-cream style while improving menu selection, room updates, browser participation across rooms, and Potluck shopping continuity. Historical test counts and dependency audit results do not establish verification of this update. Real GitHub callback evidence, a managed PostgreSQL restore rehearsal, non-local deployment, and the complete staging rerun remain required. Deployment is handled by the project owner; no production completion is claimed. Individual spending caps and complete religious-diet certification rules also remain open.

## Tech Stack

- Next.js App Router
- TypeScript
- React Server Components and Server Actions
- Zod validation
- Prisma schema for PostgreSQL
- Vitest unit tests
- Playwright E2E test
- Lucide React icons

## Local Setup

Use the Node.js version recorded in `.node-version` and `.nvmrc` (24.19.0), with npm 11.17.0 as recorded in `package.json`. CI and staging acceptance use that same Node/npm pair. The supported minimum remains Node.js 22.19 in the 22.x line; older Node releases do not meet the performance audit's requirements.

When updating dependencies, generate the lockfile with npm 11.17.0 in a clean directory containing the manifests and no existing `node_modules`. Verify a clean install afterward. Updating from an installed Windows dependency tree can omit optional packages required by Linux hosting.

Install dependencies and start the local database in one terminal:

```bash
npm ci
npm run db:dev
```

Keep that terminal open. For a first setup, use a second terminal to create the environment file:

```bash
copy .env.example .env
```

Run `npx prisma dev ls` and copy the displayed TCP PostgreSQL URL into `DATABASE_URL` in `.env`. Configure the session secret described below, then apply the schema, seed the catalog, and start the app:

```bash
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

`SHADOW_DATABASE_URL` is only required when creating new migrations with `npm run db:migrate`. Use `npm run db:dev -- status` to inspect the named database and `npm run db:dev -- stop` to stop it while preserving its data. `npm run db:verify-local` checks recovery from 150 abruptly disconnected clients without changing application data.

The project launcher uses pinned local runtime packages and fixes a known socket-close lifecycle defect that otherwise exhausts connection slots after failed clients disconnect. It does not edit installed dependency files. Its version guard intentionally requires review when those packages change. Use this launcher instead of starting an unpatched cached Prisma daemon.

Run only one active database-using app or test process at a time against this local runtime; keep other previews idle during browser and performance gates. Separate processes each have their own pool, so `DATABASE_POOL_SIZE="1"` does not prevent overlapping queries. The observed `08P01` prepared-statement failure matches [upstream issue #1046](https://github.com/electric-sql/pglite/issues/1046); the [official PGlite Socket documentation](https://pglite.dev/docs/pglite-socket) explains its different connection model. The 150-disconnection check proves lifecycle recovery only. Use a real PostgreSQL service for production and multi-process concurrency acceptance.

After a forced shutdown on Windows, allow about 30 seconds for the runtime's stale lock to expire before restarting. Do not remove database or lock files to bypass recovery.

Apply all thirteen migrations with `npm run db:deploy`, ending with `20260908010000_correct_tofu_shopping_category`, before using an existing database with this build. `npm run db:seed` populates only the ingredient and dish catalog, including the added meal formats. New rooms are created through the app.

Set `BETTER_AUTH_SECRET` to at least 32 random characters so browser sessions remain valid across server restarts. Localhost can start with an automatically generated in-memory secret, but restarting that server invalidates its sessions. `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` should match the address you open. Leave `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` empty to use guest access only; configure both to offer GitHub sign-in as well.

For the experimental local server, use `DATABASE_POOL_SIZE="1"` and leave `DATABASE_POOL_MAX_USES` empty or set it to `0`. Recycling the TCP connection after every checkout can exhaust the local proxy and corrupt prepared-statement session state. Normal hosted PostgreSQL can use a larger pool.

Useful commands:

```bash
npm run typecheck
npm run test
npm run test:db
npm run build
npm run test:e2e
npm run audit:performance
npm run security:secrets
npm run db:studio
```

Managed staging setup, recovery, and remote acceptance are defined in [`docs/STAGING_OPERATIONS_RUNBOOK.md`](docs/STAGING_OPERATIONS_RUNBOOK.md). The final evidence template is [`docs/STAGING_ACCEPTANCE_REPORT.md`](docs/STAGING_ACCEPTANCE_REPORT.md).

## Try the Full Workflow as a Guest

1. Open `/`.
2. Choose **Continue as guest**. This opens your dashboard with a new private browser account; GitHub is not required.
3. Create a room and choose a meal format. Set the planned guest count (including yourself) and an optional total budget, then fill in **Your meal preferences** before choosing **Create room**.
4. Your response appears in the guest list with a **Host** label and is included in menu planning. Choose **My preferences** to review or update it before voting starts.
5. Open **Plans** and choose **Generate plans**. Review the menus and save a Like, Neutral, or Veto with a reason.
6. Choose **Finalize plan** on the menu you want.
7. Open **Shopping** to review groceries, assign items, and mark purchases. If public sharing was enabled for the room, its final menu can also be shared using the room's Share link.

To plan with other people, copy the room's invite link and send it to them before generating plans. They can submit preferences without a host account. Creators can vote using the response saved during room creation. For older rooms without a creator response, use **Add my preferences** before moving to voting.

Guest host access stays in the same browser for up to seven days. Choose **Save my rooms** to link the current host account to GitHub when OAuth is configured. This is the path to retain those rooms through an account you can return to across devices; real GitHub callback validation remains pending. Without that link, ending the guest session, clearing cookies, or losing the session removes access to that anonymous account's rooms. The app asks for confirmation before ending a guest session.

Every room expires seven days (168 hours) after creation, including rooms hosted through GitHub. A notice on creation and room pages shows this policy and the expiration date. Editing a room or connecting an account does not extend its lifetime. Creators can use **Delete room** on the overview to permanently remove it sooner after confirming; guest responses, menus, votes, shopping progress, and invite/share links are removed with it. Expired rooms become inaccessible immediately and are physically deleted by the next successful daily cleanup job. This policy also applies to existing rooms when the release is deployed.

For Vercel, set `CRON_SECRET` in the Production environment before deploying the included daily schedule. Other hosts can schedule `npm run ops:cleanup`. See [room retention setup](docs/deployment/room-retention.md) for configuration and cleanup timing.

A browser keeps a separate meal-response session for each room. Joining another room preserves access to earlier responses, and room-specific preferences and voting use that room's participant identity. Use separate browser profiles or devices for different participants in the same room. Host-account sessions remain separate from meal-response sessions.

The old `/demo` entry redirects to `/auth`. The deterministic local E2E identity remains restricted to automated tests and is unavailable during normal development or managed deployment.

## Architecture

```txt
src/
  app/                  Next.js routes and server actions
  components/           Reusable room, menu, shopping, layout, and UI components
  lib/
    menu-engine/        Constraint filtering, dish scoring, plan generation
    shopping-engine/    Ingredient scaling, merging, and assignment
    seed-data.ts        Ingredient/dish catalog and deterministic test fixtures
    prisma.ts           Prisma Client singleton and PostgreSQL adapter
    store.ts            Prisma-backed workflow queries and transactions
    validations/        Zod form schemas
prisma/
  migrations/           Versioned PostgreSQL schema migrations
  schema.prisma         PostgreSQL relational model
  seed.ts               Idempotent ingredient and dish catalog seed
tests/
  unit/                 Deterministic domain logic tests
  e2e/                  Complete browser workflows and interaction checks
```

## Recommendation Engine

The engine separates hard constraints from soft scoring.

Hard constraints exclude dishes that conflict with allergies, strict diet rules, severe spice mismatch, pork restrictions, shellfish restrictions, or gluten-free requirements.

Soft scoring rewards liked ingredients and broadly compatible dishes, then penalizes dislikes, spice mismatch, cost pressure, and long prep time. It builds menu combinations from safe dishes and returns the top three plans.

## Shopping Engine

The shopping engine scales ingredient quantities by servings, merges identical ingredients with the same unit, estimates item cost, groups by ingredient category, and assigns items to guests who said they can bring groceries. Assignment uses a greedy cost-balancing strategy.

For Potluck, claiming or releasing a dish recalculates the groceries still needed. Unchanged or reduced ingredient quantities keep their assignments and purchase checks, including deliberate unassignments. Increased quantities keep their assignment but receive a new unchecked row, so an old purchase submission cannot mark the larger quantity purchased. Ingredients no longer needed are removed. Transferring a dish between contributors leaves groceries unchanged and resets that dish's readiness.

## Environment Variables

```env
DATABASE_URL=
DIRECT_URL=
SHADOW_DATABASE_URL=
DATABASE_POOL_SIZE=
DATABASE_POOL_MAX_USES=
DATABASE_RUNTIME_MODE=
TABLESYNC_DATABASE_SCOPE=
TABLESYNC_DEPLOYMENT_ENV=
TABLESYNC_DEPLOYMENT_ID=
TABLESYNC_GIT_SHA=
TABLESYNC_EXPECTED_MIGRATION=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_TRUSTED_ORIGINS=
NEXT_PUBLIC_APP_URL=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
```

In a managed Web runtime, set `TABLESYNC_DATABASE_SCOPE=runtime` and do not expose `DIRECT_URL`. The protected staging migration/acceptance job sets `TABLESYNC_DATABASE_SCOPE=acceptance` and receives both pooled and direct URLs.

On Vercel, enable **Enable access to System Environment Variables**. TableSync automatically uses `VERCEL_DEPLOYMENT_ID` and `VERCEL_GIT_COMMIT_SHA` for deployment identity; other hosts and the protected acceptance job require explicit `TABLESYNC_DEPLOYMENT_ID` and `TABLESYNC_GIT_SHA`. Keep `TABLESYNC_DEPLOYMENT_ENV` explicit. See [Vercel's system-variable documentation](https://vercel.com/docs/environment-variables/system-environment-variables).

## Next Milestones

- Provision the separate-role, TLS managed PostgreSQL staging targets and execute the fresh/upgrade/backup/restore rehearsal.
- Configure the staging GitHub OAuth app and prove deny/success/reload/logout/revocation with real callbacks.
- Deploy one attributable HTTPS staging build and run the protected browser, accessibility, responsive, Lighthouse, security, and rollback gate.
- Complete integrated acceptance for the current collaboration changes, then evaluate further product scope against the production-readiness plan.

