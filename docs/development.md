# Development guide

[Documentation index](README.md) · [Project overview](../README.md) · [User guide](user-guide.md)

## Prerequisites

Use Node.js **24.19.0**, recorded in [`.node-version`](../.node-version) and [`.nvmrc`](../.nvmrc), with npm **11.17.0**, recorded in [`package.json`](../package.json). CI and staging acceptance use that pair. The supported minimum in the Node.js 22 line is 22.19; older releases do not meet the performance audit's requirements.

When updating dependencies, generate the lockfile with npm 11.17.0 in a clean directory containing the manifests and no existing `node_modules`. Verify a clean install afterward. Updating from an installed Windows dependency tree can omit optional packages required by Linux hosting.

## Local setup

Install dependencies and start the local database in one terminal:

```bash
npm ci
npm run db:dev
```

Keep that terminal open. In a second terminal, create `.env` from [`.env.example`](../.env.example):

```powershell
Copy-Item .env.example .env
```

On macOS or Linux, use `cp .env.example .env`. Run `npx prisma dev ls` and copy the displayed TCP PostgreSQL URL into `DATABASE_URL`. Set `BETTER_AUTH_SECRET` to at least 32 random characters, then apply all migrations, seed the catalog, and start the app:

```bash
npm run db:deploy
npm run db:seed
npm run dev
```

Open [localhost:3000](http://localhost:3000). The seed is idempotent and populates only the ingredient and dish catalog; create rooms through the app. Existing databases must receive all migrations in [`prisma/migrations`](../prisma/migrations) before running the application.

`SHADOW_DATABASE_URL` is required only when creating migrations with `npm run db:migrate`. Use `npm run db:dev -- status` to inspect the named database and `npm run db:dev -- stop` to stop it while preserving its data.

### Local database constraints and recovery

The [project launcher](../scripts/local-database.ts) uses pinned local runtime packages and fixes a socket-close lifecycle defect that otherwise exhausts connection slots after failed clients disconnect. It does not edit installed dependency files. Its version guard requires review when those packages change. Use `npm run db:dev` instead of starting an unpatched cached Prisma daemon.

- Run only one active database-using app or test process at a time against this local runtime. Keep other previews idle during browser and performance gates. Separate processes each have their own pool, so `DATABASE_POOL_SIZE="1"` does not prevent overlapping queries.
- Set `DATABASE_POOL_SIZE="1"` and leave `DATABASE_POOL_MAX_USES` empty or set it to `0`. Recycling the TCP connection after every checkout can exhaust the local proxy and corrupt prepared-statement session state.
- After a forced shutdown on Windows, allow about 30 seconds for the stale lock to expire before restarting. Do not remove database or lock files to bypass recovery.
- `npm run db:verify-local` checks recovery from 150 abruptly disconnected clients without changing application data. It verifies lifecycle recovery only; use a real PostgreSQL service for production and multi-process concurrency acceptance.

## Authentication and environment

Use [`.env.example`](../.env.example) as the local configuration reference. Keep real values in local environment files or the hosting/CI secret stores.

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL` | Application PostgreSQL connection. |
| `DIRECT_URL` | Direct migration connection, when needed; exclude it from managed web runtimes. |
| `SHADOW_DATABASE_URL` | Shadow database for creating migrations. |
| `DATABASE_POOL_SIZE`, `DATABASE_POOL_MAX_USES`, `DATABASE_RUNTIME_MODE` | Connection pool configuration; follow the local constraints above or the hosting template. |
| `BETTER_AUTH_SECRET` | Stable session secret of at least 32 random characters. |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | The origin used to open the app; these should match. |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | Optional GitHub OAuth credentials; configure both or leave both empty. |
| `AUTH_TRUSTED_ORIGINS` | Additional allowed authentication origins. |
| `TABLESYNC_DATABASE_SCOPE`, `TABLESYNC_DEPLOYMENT_ENV` | Explicit database scope and deployment environment. |
| `TABLESYNC_DEPLOYMENT_ID`, `TABLESYNC_GIT_SHA`, `TABLESYNC_EXPECTED_MIGRATION` | Deployment and schema identity used by verification. |
| `CRON_SECRET` | Bearer secret for scheduled HTTP room cleanup. |

Localhost can start with an automatically generated in-memory auth secret, but restarting that server invalidates its sessions. Configure a stable secret for normal development. Guest-only access requires no GitHub credentials. GitHub sign-in also enables **Save my rooms** for guest hosts.

The legacy `/demo` route redirects to `/auth`. The deterministic E2E identity is restricted to automated tests and is unavailable during normal development or managed deployment.

### Managed environments

The repository separates [hosting runtime settings](deployment/runtime.env.example) from [protected acceptance-job settings](deployment/acceptance.env.example). In a managed web runtime, set `TABLESYNC_DATABASE_SCOPE=runtime` and do not expose `DIRECT_URL`. The protected migration/acceptance job uses `TABLESYNC_DATABASE_SCOPE=acceptance` and receives both pooled and direct URLs. Normal hosted PostgreSQL can use a larger pool than the experimental local runtime.

On Vercel, enable **Enable access to System Environment Variables**. TableSync uses `VERCEL_DEPLOYMENT_ID` and `VERCEL_GIT_COMMIT_SHA` for deployment identity. Other hosts and the protected acceptance job require explicit `TABLESYNC_DEPLOYMENT_ID` and `TABLESYNC_GIT_SHA`. Keep `TABLESYNC_DEPLOYMENT_ENV` explicit.

Follow the [operations runbook](deployment/STAGING_OPERATIONS_RUNBOOK.md) for managed database setup, recovery, and remote acceptance. Use the [acceptance report](deployment/STAGING_ACCEPTANCE_REPORT.md) to record results. Configure scheduled deletion using the [room retention guide](deployment/room-retention.md).

## Commands and verification

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Check TypeScript. |
| `npm run test` | Run unit tests. |
| `npm run test:db` | Run PostgreSQL integration tests. |
| `npm run build` | Build the production application. |
| `npm run test:e2e` | Run production-build Playwright acceptance scenarios. |
| `npm run audit:performance` | Run Lighthouse performance gates. |
| `npm run security:secrets` | Scan for committed secrets. |
| `npm run db:studio` | Inspect the local database with Prisma Studio. |

Tests cover domain logic, authentication and permissions, deployment boundaries, concurrent updates, rate limiting, presentation, and audit behavior. Browser checks include accessibility and responsive layouts. See [`package.json`](../package.json) and [`tests/`](../tests) for all commands and scenarios. Test counts and dated results belong in the [archive](archive/) and [evidence](evidence/), rather than serving as a claim about the current deployment.

## Architecture

```text
src/
  app/                  Next.js routes and server actions
  components/           Room, menu, shopping, layout, and UI components
  lib/
    menu-engine/        Constraint filtering, dish scoring, plan generation
    shopping-engine/    Ingredient scaling, merging, and assignment
    seed-data.ts        Ingredient/dish catalog and deterministic test fixtures
    prisma.ts           Prisma Client singleton and PostgreSQL adapter
    store.ts            Workflow queries and transactions
    validations/        Zod form schemas
prisma/
  migrations/           Versioned PostgreSQL schema migrations
  schema.prisma         Relational model
  seed.ts               Idempotent ingredient and dish catalog seed
tests/
  unit/                 Domain and application logic tests
  database/             PostgreSQL integration tests
  e2e/                  Browser workflows and interaction checks
```

Application, authentication, guest-session, rate-limit, and security-audit data is stored in PostgreSQL. Visible room pages check for changes every eight seconds while preserving unsaved form drafts.

The menu engine separates hard constraints from soft scoring. Hard constraints exclude dishes that conflict with allergies, strict diet rules, severe spice mismatch, pork or shellfish restrictions, or gluten-free requirements. Soft scoring rewards liked ingredients and broadly compatible dishes, then penalizes dislikes, spice mismatch, cost pressure, and long preparation time. It returns up to three menu plans. Individual spending caps and complete religious-diet certification rules are not implemented.

The shopping engine scales quantities by servings, merges identical ingredients with the same unit, estimates costs, groups by ingredient category, and assigns groceries using a greedy cost-balancing strategy. Potluck contribution changes preserve unaffected assignments and purchase checks; increased quantities require a new purchase check. See the [user guide](user-guide.md#potluck-contributions) for contribution behavior and the [meal-format specification](product/EVENT_FORMAT_EXPANSION.md) for format details.
