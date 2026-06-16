# TableSync

TableSync is a collaborative dinner planning app for friend groups. A host creates a dinner room, guests submit dietary restrictions and preferences, the app generates safe menu plans, collects votes, finalizes a menu, and turns it into an assigned shopping list.

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
- Unit tests for menu and shopping logic
- Playwright smoke test for the demo flow
- Prisma schema matching the planned relational model

The app currently uses an in-memory demo store so it can run immediately without provisioning Postgres. The Prisma schema is included as the target database model for the next persistence milestone.

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
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
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
    store.ts            In-memory workflow store
    validations/        Zod form schemas
prisma/
  schema.prisma         Target PostgreSQL model
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

- Replace the in-memory store with Prisma Client queries and migrations.
- Add Auth.js OAuth for GitHub and Google.
- Store guest edit tokens in cookies and enforce guest-scoped mutations.
- Add route-level authorization helpers.
- Add realtime invalidation or polling for room updates.
- Expand Playwright coverage for create room, join, vote, finalize, and shopping mutation flows.
- Add screenshots and a deployed Vercel link.

