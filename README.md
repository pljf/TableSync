# TableSync

TableSync is a collaborative dinner planning app for friend groups. A host creates a dinner room, guests submit dietary restrictions and preferences, the app generates safe menu plans, collects votes, finalizes a menu, and turns it into an assigned shopping list.

Development progress and technical decisions are recorded in [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md).

## Current Build

This repository now contains a working Next.js vertical slice:

- Demo host sign-in
- Seeded Friday Hotpot Night room
- Guest join form
- Constraint summary for diets, allergies, likes, budget, and spice
- Deterministic menu recommendation engine
- Voting and veto controls
- Plan finalization
- Shopping list generation, assignment, and purchased state
- Public read-only share page
- PostgreSQL persistence through Prisma Client
- Idempotent catalog and demo-room database seed
- Initial Prisma migration
- Unit tests for menu and shopping logic
- Playwright smoke test for the demo flow

All room, guest, plan, vote, shopping, and activity data is stored in PostgreSQL. Authentication still uses a demo host cookie and is the next major production milestone.

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

If the experimental local server drops reused connections, set `DATABASE_POOL_MAX_USES="1"` in `.env`. Leave it empty for a normal hosted PostgreSQL database.

Useful commands:

```bash
npm run typecheck
npm run test
npm run test:db
npm run build
npm run test:e2e
npm run db:studio
```

## Demo Flow

1. Open `/`.
2. Click `Open demo`.
3. Review the seeded room dashboard.
4. Open the guest invite path from the room page.
5. Submit a guest preference form.
6. Sign in as demo host from `/auth`.
7. Generate or review menu plans.
8. Vote, finalize, and open the shopping workflow.
9. Open `/share/room-friday-hotpot` for the public final plan.

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
SHADOW_DATABASE_URL=
DATABASE_POOL_SIZE=
DATABASE_POOL_MAX_USES=
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXT_PUBLIC_APP_URL=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
```

## Next Milestones

- Add Auth.js OAuth for GitHub and Google.
- Store guest edit tokens in cookies and enforce guest-scoped mutations.
- Add route-level authorization helpers.
- Add realtime invalidation or polling for room updates.
- Expand Playwright coverage for create room, join, vote, finalize, and shopping mutation flows.
- Add screenshots and a deployed Vercel link.

