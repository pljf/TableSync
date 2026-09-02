# TableSync

TableSync is a collaborative dinner planning app for friend groups. A host creates a dinner room, guests submit dietary restrictions and preferences, the app generates safe menu plans, collects votes, finalizes a menu, and turns it into an assigned shopping list.

The completed core-MVP acceptance contract is maintained in [`docs/CORE_MVP_EXECUTION_PLAN.md`](docs/CORE_MVP_EXECUTION_PLAN.md). The active production-readiness goal, permission matrix, threat model, phases, and evidence ledger are maintained in [`docs/PRODUCTION_READINESS_PLAN.md`](docs/PRODUCTION_READINESS_PLAN.md). Development progress and technical decisions are recorded in [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md).

## Current Build

This repository now contains a production-hardened local vertical slice:

- Better Auth GitHub OAuth with database-backed, revocable host sessions
- Strictly isolated CI-local test identity; no deployable demo-login bypass
- Deny-by-default host/guest authorization and tokenless hashed guest sessions
- Seeded Friday Hotpot Night room
- Guest join form
- Constraint summary for diets, allergies, likes, budget, and spice
- Strict deterministic Dinner and Hotpot recommendation engines
- Like, Neutral, and required-reason Veto controls
- Plan finalization
- Shopping list generation, assignment, and purchased state
- Public read-only share page
- PostgreSQL persistence through Prisma Client
- Idempotent catalog and demo-room database seed
- Ten versioned Prisma migrations
- 37 unit tests and 8 PostgreSQL integration tests for domain, auth, permissions, health/deployment boundaries, concurrency, rate limiting, and audit behavior
- 18 production-build Playwright tests across Chromium, Firefox, and WebKit (16 pass plus 2 intentional protocol-only engine skips)
- Automated Axe, responsive screenshot, touch-target, and Lighthouse quality gates
- Managed-database TLS/role validation, attributable health checks, and a protected remote staging acceptance workflow

All application, authentication, guest-session, rate-limit, and security-audit data is stored in PostgreSQL. The core MVP and provider-independent production hardening pass locally. Real GitHub callback evidence, a managed PostgreSQL restore rehearsal, non-local deployment, production dependency audit, and the complete staging rerun remain required; no remote completion is claimed.

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

```bash
npm install
npm run db:dev
copy .env.example .env
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

After `npm run db:dev`, run `npx prisma dev ls` and copy the displayed TCP PostgreSQL URL into `DATABASE_URL` in `.env`. `SHADOW_DATABASE_URL` is only required when creating new migrations with `npm run db:migrate`.

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

## Demo Flow

1. Open `/`.
2. Click `Open demo`.
3. Review the seeded room dashboard.
4. Open the guest invite path from the room page.
5. Submit a guest preference form.
6. Review the plans and shopping workflow in the explicitly seeded read-only demo surface.
7. Open `/share/room-friday-hotpot` for the public final plan.

Creating and managing private rooms requires a configured GitHub OAuth provider. The deterministic local E2E identity is intentionally unavailable during normal development and in every managed deployment.

## Architecture

```txt
src/
  app/                  Next.js routes and server actions
  components/           Reusable room, menu, shopping, layout, and UI components
  lib/
    menu-engine/        Constraint filtering, dish scoring, plan generation
    shopping-engine/    Ingredient scaling, merging, and assignment
    seed-data.ts        Demo room, guests, ingredients, and dish catalog
    prisma.ts           Prisma Client singleton and PostgreSQL adapter
    store.ts            Prisma-backed workflow queries and transactions
    validations/        Zod form schemas
prisma/
  migrations/           Versioned PostgreSQL schema migrations
  schema.prisma         PostgreSQL relational model
  seed.ts               Idempotent catalog and demo data seed
tests/
  unit/                 Deterministic domain logic tests
  e2e/                  Playwright smoke flow
```

## Recommendation Engine

The engine separates hard constraints from soft scoring.

Hard constraints exclude dishes that conflict with allergies, strict diet rules, severe spice mismatch, pork restrictions, shellfish restrictions, or gluten-free requirements.

Soft scoring rewards liked ingredients and broadly compatible dishes, then penalizes dislikes, spice mismatch, cost pressure, and long prep time. It builds menu combinations from safe dishes and returns the top three plans.

## Shopping Engine

The shopping engine scales ingredient quantities by servings, merges identical ingredients with the same unit, estimates item cost, groups by ingredient category, and assigns items to guests who said they can bring groceries. Assignment uses a greedy cost-balancing strategy.

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

## Next Milestones

- Authorize and review the production dependency audit.
- Provision the separate-role, TLS managed PostgreSQL staging targets and execute the fresh/upgrade/backup/restore rehearsal.
- Configure the staging GitHub OAuth app and prove deny/success/reload/logout/revocation with real callbacks.
- Deploy one attributable HTTPS staging build and run the protected browser, accessibility, responsive, Lighthouse, security, and rollback gate.
- Consider realtime updates or additional product scope only after this production-readiness goal is accepted.

