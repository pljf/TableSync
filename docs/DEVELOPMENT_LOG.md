# TableSync Development Log

This file records completed work, important technical decisions, verification results, and upcoming milestones.

## Current Status

TableSync is a working Next.js application with PostgreSQL persistence. The main dinner-planning workflow is implemented:

1. A host creates a dinner room.
2. Guests join and submit food preferences.
3. TableSync generates menu plans.
4. Guests vote on plans.
5. The host finalizes a plan.
6. TableSync generates and assigns a shopping list.
7. A finalized room can be shared publicly.

The application still uses a demo host session. Production authentication and authorization are the next major milestone.

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

1. Add production authentication and authorization.
2. Store guest edit tokens securely and enforce guest-scoped mutations.
3. Expand Playwright coverage for room creation, joining, voting, finalization, and shopping mutations.
4. Deploy the application and PostgreSQL database.
5. Add deployment details, screenshots, and a live link to the README.
6. Consider realtime updates or polling after the production workflow is stable.

## Working Agreement

Complete one milestone at a time. After each milestone:

1. Verify the implementation.
2. Record the result in this file.
3. List the remaining milestones.
4. Discuss the next milestone before starting it.
