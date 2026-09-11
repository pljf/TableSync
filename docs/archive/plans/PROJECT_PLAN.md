# TableSync Project Plan

> Historical record. Status statements and verification results reflect the work recorded here. See the [archive index](../README.md) for context and current guides.

> **Event expansion accepted (2026-09-08):** Potluck, BBQ, Picnic, Brunch, and Other are implemented alongside Dinner and Hotpot. The [Seven-format planning contract](../../product/EVENT_FORMAT_EXPANSION.md) records their menu rules, Potluck contribution behavior and passing local acceptance evidence. Existing safety and workflow guarantees remain required.

> **Execution note (2026-08-01):** This file remains the long-term product vision and feature inventory. The completed core-MVP contract is maintained in [`docs/archive/plans/CORE_MVP_EXECUTION_PLAN.md`](CORE_MVP_EXECUTION_PLAN.md). The active production-authentication, authorization, managed-database, staging-deployment, and re-acceptance contract is [`docs/archive/plans/PRODUCTION_READINESS_PLAN.md`](PRODUCTION_READINESS_PLAN.md); it is authoritative where milestone ordering conflicts.

## 1. Project Summary

**Project name:** TableSync

**One-line pitch:** A collaborative dinner planning platform that turns guest preferences, dietary restrictions, budget, votes, and shopping responsibilities into an actionable group meal plan.

**Core idea:** Instead of one person asking AI what to cook, TableSync lets every guest submit structured preferences through an invite link. The app then aggregates constraints, proposes menu options, collects votes, finalizes a plan, generates a shopping list, and assigns purchasing responsibilities.

**Portfolio goal:** Build a full-stack project strong enough for junior full-time software engineering applications. The project should demonstrate product thinking, full-stack architecture, database modeling, authentication, authorization, structured business logic, testing, deployment, and a polished user experience.

## 2. Target Users

### Primary User

College students, roommates, friend groups, clubs, and small teams planning a dinner, potluck, hotpot night, BBQ, picnic, or house party.

### Secondary User

Families or shared households planning meals while accounting for different dietary restrictions and budgets.

### Main User Pain

Group meal planning usually happens in messy group chats:

- Someone has a food allergy.
- Someone is vegetarian.
- Someone does not eat spicy food.
- Someone has a lower budget.
- People keep suggesting conflicting options.
- Nobody knows who buys what.
- The final grocery list is scattered across messages.

TableSync turns that messy conversation into a structured workflow.

## 3. MVP Scope

The MVP must be complete enough to demo live.

### Must Have

1. Host authentication
2. Create dinner room
3. Generate invite link
4. Guest join form without mandatory account creation
5. Dietary restrictions and preference collection
6. Constraint summary
7. Menu plan generation without AI
8. Voting and veto
9. Finalize menu plan
10. Generate shopping list
11. Assign shopping items
12. Mark shopping items as purchased
13. Activity timeline
14. Demo room with seed data
15. Public read-only share page
16. Responsive UI
17. Unit tests for recommendation and shopping logic
18. Playwright E2E test for main flow
19. Deployed production link
20. High-quality README

### Not In MVP

These should be saved for later:

- Payment collection
- Restaurant ordering
- Real grocery store price integration
- Native mobile app
- Complex AI agent workflow
- Full social network
- Chat system
- Recipe image uploads

## 4. Recommended Tech Stack

### Frontend and Backend

- **Next.js App Router**
- **TypeScript**
- **React Server Components where useful**
- **Server Actions for form mutations**
- **Route Handlers for public API endpoints**

Reason: One repo can cover frontend, backend, routing, server rendering, forms, and deployment. This is efficient for a solo student project and is common in modern full-stack React projects.

### UI

- **Tailwind CSS**
- **shadcn/ui**
- **lucide-react**

Reason: Fast to build polished, accessible UI without designing every primitive from scratch.

### Forms and Validation

- **react-hook-form**
- **zod**

Reason: Strong client-side form ergonomics and shared validation schemas.

### Database

- **PostgreSQL**
- **Prisma ORM**

Reason: PostgreSQL shows real relational data modeling skill. Prisma keeps development fast and type-safe.

### Auth

- **Better Auth 1.6 with Prisma-backed sessions**
- OAuth providers:
  - GitHub
  - Google remains deferred until a product need justifies a second provider

Reason: OAuth login is useful for a portfolio project and avoids storing passwords.

### Realtime

Use one of these:

- **Pusher** for simplest realtime integration
- **Supabase Realtime** if using Supabase Postgres

MVP can work without realtime if needed, but adding realtime room updates makes the app feel more complete.

### Data Fetching

- Server-side fetching for initial page data
- `TanStack Query` only for interactive client state such as voting, shopping item toggles, and realtime invalidation

### Testing

- **Vitest** for unit tests
- **Playwright** for E2E tests
- **GitHub Actions** for CI

### Deployment

- **Vercel** for Next.js app
- **Supabase** or **Neon** for Postgres

## 5. Core Product Workflow

### Workflow A: Host Creates Dinner Room

1. Host signs in.
2. Host clicks "New room".
3. Host fills:
   - Dinner title
   - Date and time
   - Location
   - Event type: Dinner, Hotpot, Potluck, BBQ, Picnic, Brunch, or Other (shared buffet)
   - Expected number of guests
   - Total budget
   - Preferred cuisine options
   - Whether guests can bring items
4. App creates room and invite token.
5. Host lands on room dashboard.
6. Host copies invite link.

### Workflow B: Guest Joins With Link

1. Guest opens `/join/[token]`.
2. Guest enters:
   - Name
   - Email optional
   - Diet type
   - Allergies
   - Disliked ingredients
   - Liked ingredients
   - Spice tolerance
   - Budget comfort level
   - Can bring food or groceries
   - Notes
3. App creates guest record.
4. App stores an edit token in cookie so guest can update their own entry later.
5. Guest sees room summary and other guest constraints.

### Workflow C: Generate Menu Plans

1. Host clicks "Generate plans".
2. Server loads:
   - Room
   - Guests
   - Preferences
   - Dish catalog
   - Ingredients
3. Recommendation engine filters unsafe dishes.
4. Engine scores candidate dishes.
5. Engine creates 3 menu plans.
6. Plans are saved to DB.
7. Activity event is created.

### Workflow D: Vote and Veto

1. Guests see menu plan cards.
2. Each plan shows:
   - Dishes
   - Estimated total cost
   - Prep time
   - Matched preferences
   - Warnings
   - Coverage score
3. Guests vote:
   - Like
   - Neutral
   - Veto
4. Veto requires a short reason.
5. Vote totals update.

### Workflow E: Finalize Plan

1. Host reviews votes.
2. Host clicks "Finalize".
3. System marks one plan as final.
4. System generates shopping list from plan ingredients.
5. System assigns shopping items if guest availability exists.
6. Room status becomes `FINALIZED`.

For finalized Potluck rooms, willing guests can claim a whole dish at its planned servings and mark it ready; the host can assign dishes to willing guests in the room. Ownership changes require confirmation before rebuilding shared groceries and clearing their assignment/purchase progress. Contributed dishes remain in the total food budget, while shared shopping includes only unclaimed dishes. Undoing finalization clears contributions, readiness and shopping. See [Seven-format planning contract](../../product/EVENT_FORMAT_EXPANSION.md) for full rules and acceptance evidence.

### Workflow F: Shopping and Execution

1. Guests open shopping page.
2. Shopping list grouped by category:
   - Produce
   - Meat and seafood
   - Dairy
   - Pantry
   - Frozen
   - Drinks
   - Disposable supplies
3. Guests can claim items.
4. Assigned items show estimated cost.
5. Purchased items can be checked off.
6. Room displays:
   - Total estimated cost
   - Cost per person
   - Cost per assigned guest
   - Remaining unassigned items

## 6. User Roles and Permissions

### Host

Can:

- Create room
- Edit room details
- Regenerate invite link
- Generate menu plans
- Finalize menu plan
- Delete menu plan
- Generate shopping list
- Assign shopping items
- Archive room

### Guest

Can:

- Join through invite link
- Edit own preferences
- Vote on menu plans
- Veto menu plan with reason
- Claim shopping items
- Mark own assigned items as purchased

### Public Viewer

Can:

- View finalized read-only plan if public sharing is enabled

Cannot:

- Vote
- Edit preferences
- See private guest emails
- Modify shopping items

## 7. Database Design

### Prisma Model Draft

```prisma
model User {
  id        String   @id @default(cuid())
  name      String?
  email     String   @unique
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  rooms     DinnerRoom[] @relation("RoomHost")
}

model DinnerRoom {
  id                String     @id @default(cuid())
  hostId            String
  title             String
  description       String?
  eventType         EventType
  dateTime          DateTime?
  location          String?
  totalBudgetCents  Int?
  expectedGuests    Int?
  status            RoomStatus @default(DRAFT)
  inviteToken        String     @unique
  inviteExpiresAt    DateTime?
  isPublicShareable  Boolean    @default(false)
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  host       User            @relation("RoomHost", fields: [hostId], references: [id], onDelete: Cascade)
  guests     Guest[]
  plans      MenuPlan[]
  shopping   ShoppingItem[]
  activities ActivityEvent[]
}

model Guest {
  id          String   @id @default(cuid())
  roomId      String
  name        String
  email       String?
  editToken   String   @unique
  isHostGuest Boolean  @default(false)
  canBring    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  room        DinnerRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  preference  Preference?
  votes       Vote[]
  assignments ShoppingItem[] @relation("ShoppingAssignment")
}

model Preference {
  id              String    @id @default(cuid())
  guestId         String    @unique
  dietType        DietType  @default(OMNIVORE)
  allergies       String[]
  dislikes        String[]
  likes           String[]
  spiceLevel      SpiceLevel @default(MEDIUM)
  maxBudgetCents  Int?
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  guest           Guest     @relation(fields: [guestId], references: [id], onDelete: Cascade)
}

model Dish {
  id                 String       @id @default(cuid())
  name               String
  description        String?
  category           DishCategory
  cuisine            String
  baseServings       Int          @default(4)
  estimatedCostCents Int
  prepTimeMinutes    Int
  spiceLevel         SpiceLevel   @default(MEDIUM)
  tags               String[]
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  ingredients        DishIngredient[]
  menuItems          MenuPlanDish[]
}

model Ingredient {
  id          String             @id @default(cuid())
  name        String             @unique
  category    IngredientCategory
  defaultUnit String
  tags        String[]

  dishes      DishIngredient[]
  shopping    ShoppingItem[]
}

model DishIngredient {
  id           String @id @default(cuid())
  dishId       String
  ingredientId String
  quantity     Float
  unit         String

  dish         Dish       @relation(fields: [dishId], references: [id], onDelete: Cascade)
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)

  @@unique([dishId, ingredientId, unit])
}

model MenuPlan {
  id                 String     @id @default(cuid())
  roomId             String
  title              String
  summary            String?
  score              Int
  estimatedCostCents Int
  status             PlanStatus @default(PROPOSED)
  warnings           Json?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  room               DinnerRoom     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  dishes             MenuPlanDish[]
  votes              Vote[]
}

model MenuPlanDish {
  id       String @id @default(cuid())
  planId   String
  dishId   String
  servings Int

  plan     MenuPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  dish     Dish     @relation(fields: [dishId], references: [id])

  @@unique([planId, dishId])
}

model Vote {
  id        String    @id @default(cuid())
  planId    String
  guestId   String
  value     VoteValue
  reason    String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  plan      MenuPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  guest     Guest    @relation(fields: [guestId], references: [id], onDelete: Cascade)

  @@unique([planId, guestId])
}

model ShoppingItem {
  id                 String   @id @default(cuid())
  roomId             String
  ingredientId       String
  quantity           Float
  unit               String
  estimatedCostCents Int?
  assignedToGuestId  String?
  checked            Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  room               DinnerRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  ingredient         Ingredient @relation(fields: [ingredientId], references: [id])
  assignedTo         Guest?     @relation("ShoppingAssignment", fields: [assignedToGuestId], references: [id])
}

model ActivityEvent {
  id        String   @id @default(cuid())
  roomId    String
  actorName String
  type      ActivityType
  metadata  Json?
  createdAt DateTime @default(now())

  room      DinnerRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
}

enum EventType {
  DINNER
  POTLUCK
  HOTPOT
  BBQ
  PICNIC
  BRUNCH
  OTHER
}

enum RoomStatus {
  DRAFT
  COLLECTING_PREFERENCES
  PLANNING
  VOTING
  FINALIZED
  ARCHIVED
}

enum DietType {
  OMNIVORE
  VEGETARIAN
  VEGAN
  PESCATARIAN
  HALAL
  KOSHER
  GLUTEN_FREE
}

enum SpiceLevel {
  NONE
  MILD
  MEDIUM
  HOT
}

enum DishCategory {
  MAIN
  SIDE
  APPETIZER
  DESSERT
  DRINK
  SAUCE
}

enum IngredientCategory {
  PRODUCE
  MEAT_SEAFOOD
  DAIRY
  PANTRY
  FROZEN
  DRINKS
  SUPPLIES
  OTHER
}

enum PlanStatus {
  PROPOSED
  FINALIZED
  REJECTED
}

enum VoteValue {
  LIKE
  NEUTRAL
  VETO
}

enum ActivityType {
  ROOM_CREATED
  GUEST_JOINED
  PREFERENCE_UPDATED
  PLANS_GENERATED
  VOTE_CAST
  PLAN_FINALIZED
  SHOPPING_GENERATED
  ITEM_ASSIGNED
  ITEM_CHECKED
}
```

## 8. Data Seeding

Seed data is important because recruiters should be able to see a full demo immediately.

### Seed Rooms

Create one demo room:

- Title: Friday Hotpot Night
- Event type: HOTPOT
- Budget: $120
- Expected guests: 6
- Status: FINALIZED

### Seed Guests

1. Alex: omnivore, likes beef, medium spice
2. Maya: vegetarian, no beef, likes mushrooms
3. Jordan: peanut allergy, mild spice
4. Sam: gluten-free, likes chicken
5. Priya: no pork, hot spice
6. Taylor: dislikes seafood, can bring drinks

### Seed Dish Catalog

Include 30-50 dishes across categories.

Example main dishes:

- Hotpot broth with mushroom base
- Chicken taco bowl
- Vegetarian pasta bake
- Beef bulgogi rice bowl
- Chickpea curry
- Salmon rice bowl
- Build-your-own taco night

Example sides:

- Cucumber salad
- Garlic bread
- Roasted vegetables
- Kimchi
- Rice
- Tortilla chips

Example desserts:

- Fruit platter
- Brownies
- Mochi
- Ice cream

Example drinks:

- Sparkling water
- Lemonade
- Iced tea

## 9. Recommendation Engine

The recommendation engine is the most important non-CRUD part of the project.

### Input

```ts
type GenerateMenuInput = {
  room: DinnerRoom;
  guests: GuestWithPreference[];
  dishes: DishWithIngredients[];
};
```

### Output

```ts
type GeneratedPlan = {
  title: string;
  dishIds: string[];
  score: number;
  estimatedCostCents: number;
  warnings: PlanWarning[];
};
```

### Hard Constraints

A dish should be excluded if:

- It contains an ingredient matching a guest allergy.
- It violates a strict diet type.
- It exceeds spice tolerance for too many guests.
- It contains an ingredient explicitly vetoed by host settings.

Examples:

- Vegan guest means meat and dairy dishes should be excluded unless only optional.
- Peanut allergy excludes peanut sauce and peanut garnish.
- Gluten-free guest excludes wheat pasta unless gluten-free tag exists.

### Soft Constraints

A dish can remain eligible but lose points if:

- It contains disliked ingredients.
- It is too spicy for some guests.
- It is expensive compared with room budget.
- Prep time is high.
- It does not match any likes.

### Dish Scoring Formula

Example:

```ts
score =
  50
  + likesMatched * 10
  + dietCompatibilityBonus
  + categoryBalanceBonus
  - dislikesMatched * 8
  - spicePenalty
  - costPenalty
  - prepTimePenalty
```

### Plan Generation Strategy

1. Filter unsafe dishes.
2. Group dishes by category.
3. Pick combinations:
   - 1-2 mains
   - 1-3 sides
   - 1 dessert
   - 1 drink
4. Generate 20-50 candidate plans.
5. Calculate total cost.
6. Remove plans too far over budget.
7. Score plan:
   - Average dish score
   - Category balance
   - Preference coverage
   - Budget fit
   - Guest satisfaction
8. Return top 3.

### Conflict Report

If no good plan exists, return an explanation:

```ts
type PlanWarning = {
  type: "ALLERGY_CONFLICT" | "BUDGET_TOO_LOW" | "DIET_CONFLICT" | "LOW_VARIETY";
  message: string;
  affectedGuestNames: string[];
};
```

Example message:

> No dessert was included because the current dish catalog has no gluten-free dessert below the remaining budget.

This is excellent for interviews because it shows transparent algorithm behavior.

## 10. Shopping List Engine

### Input

- Finalized menu plan
- Dishes and ingredients
- Guest count
- Guest canBring flags

### Steps

1. Calculate servings needed:
   - Use actual guest count if available.
   - Fall back to expected guests.
2. For each dish:
   - Scale ingredient quantity by `neededServings / baseServings`.
3. Merge identical ingredients:
   - Same ingredient and unit are combined.
4. Group by category.
5. Estimate cost:
   - MVP can use dish-level estimated cost split across ingredients.
   - Later version can use ingredient-level price.
6. Assign items:
   - Guests with `canBring = true` first.
   - Balance estimated cost across assigned guests.
7. Save `ShoppingItem` rows.

### Assignment Algorithm

Greedy approach:

1. Sort shopping items by estimated cost descending.
2. Sort eligible guests by current assigned cost ascending.
3. Assign next item to guest with lowest current assigned cost.
4. Repeat until all items assigned.

This is simple, explainable, and good enough for MVP.

## 11. App Routes and Pages

### `/`

Purpose: Landing page plus product demo preview.

Sections:

- Hero with clear product statement
- Live demo room preview
- Three-step explanation:
  - Invite guests
  - Vote on menus
  - Shop together
- CTA:
  - Try demo
  - Sign in

Important: The first screen should show the actual product UI, not generic marketing copy.

### `/dashboard`

Purpose: Authenticated user home.

Components:

- Room list
- New room button
- Status badges
- Upcoming dinner date
- Guest count
- Finalized / voting / collecting preferences state

### `/rooms/new`

Purpose: Create room.

Fields:

- Title
- Description
- Event type
- Date and time
- Location
- Total budget
- Expected guests
- Cuisine preferences
- Allow public share

Validation:

- Title required
- Budget must be positive
- Expected guests between 2 and 50

### `/rooms/[roomId]`

Purpose: Main room dashboard.

Tabs:

- Overview
- Guests
- Constraints
- Menu Plans
- Votes
- Shopping
- Activity

Overview cards:

- Room status
- Guest count
- Budget
- Preference completion
- Final plan status

### `/join/[token]`

Purpose: Guest onboarding.

No login required.

Steps:

1. Enter name
2. Dietary restrictions
3. Likes/dislikes
4. Budget and bring ability
5. Confirm

After submit:

- Show successful join screen
- Link to room guest view

### `/rooms/[roomId]/plans`

Purpose: Menu plan comparison and voting.

Plan card should show:

- Dishes
- Total estimated cost
- Cost per person
- Tags
- Warnings
- Likes count
- Veto count
- Vote buttons

### `/rooms/[roomId]/shopping`

Purpose: Final shopping workflow.

Features:

- Grouped item list
- Claim item
- Assigned user
- Estimated cost
- Check off purchased
- Filter:
  - All
  - Mine
  - Unassigned
  - Purchased

### `/share/[roomId]`

Purpose: Public read-only result.

Show:

- Dinner title
- Date
- Final menu
- Guest-safe summary
- Shopping categories without private guest emails

### `/demo`

Purpose: Full demo without login.

Implementation:

- Can redirect to seeded demo room in read-only or sandbox mode.
- Best option: create a demo room page that uses seeded data and disabled mutation buttons.

## 12. Component Plan

### Layout Components

- `AppShell`
- `SidebarNav`
- `TopNav`
- `MobileNav`
- `PageHeader`
- `EmptyState`
- `StatusBadge`

### Room Components

- `RoomCard`
- `CreateRoomForm`
- `InviteLinkPanel`
- `RoomStatusStepper`
- `GuestList`
- `GuestPreferenceCard`
- `ConstraintSummary`
- `ActivityTimeline`

### Menu Components

- `GeneratePlansButton`
- `MenuPlanCard`
- `DishCard`
- `PlanScoreBadge`
- `PlanWarnings`
- `VoteControls`
- `FinalizePlanDialog`

### Shopping Components

- `ShoppingList`
- `ShoppingCategoryGroup`
- `ShoppingItemRow`
- `AssignmentSelect`
- `BudgetSummary`
- `CostSplitChart`

### Form Components

- `DietTypeSelect`
- `AllergyTagInput`
- `IngredientPreferenceInput`
- `SpiceLevelControl`
- `BudgetInput`

## 13. Server Actions and API Design

### Server Actions

```ts
createRoom(input: CreateRoomInput): Promise<{ roomId: string }>
updateRoom(roomId: string, input: UpdateRoomInput): Promise<void>
joinRoom(token: string, input: JoinRoomInput): Promise<{ guestId: string }>
updatePreference(guestId: string, input: PreferenceInput): Promise<void>
generateMenuPlans(roomId: string): Promise<void>
castVote(planId: string, input: VoteInput): Promise<void>
finalizePlan(planId: string): Promise<void>
generateShoppingList(roomId: string): Promise<void>
assignShoppingItem(itemId: string, guestId: string | null): Promise<void>
toggleShoppingItem(itemId: string, checked: boolean): Promise<void>
```

### Route Handlers

Use Route Handlers when client components need fetchable endpoints:

- `GET /api/rooms/[roomId]`
- `GET /api/rooms/[roomId]/plans`
- `POST /api/rooms/[roomId]/realtime-auth`
- `GET /api/share/[roomId]`

### Validation Pattern

Every mutation should:

1. Parse input with zod.
2. Check authentication or guest edit token.
3. Check room permissions.
4. Execute DB transaction if multiple writes are required.
5. Create activity event.
6. Revalidate affected paths.
7. Trigger realtime event if implemented.

## 14. Authorization Helpers

Create `src/lib/permissions.ts`.

Recommended functions:

```ts
canViewRoom(userId: string | null, roomId: string): Promise<boolean>
canEditRoom(userId: string, roomId: string): Promise<boolean>
canFinalizePlan(userId: string, planId: string): Promise<boolean>
canEditGuest(editToken: string, guestId: string): Promise<boolean>
canVoteAsGuest(editToken: string, guestId: string): Promise<boolean>
canToggleShoppingItem(userIdOrGuestToken: Actor, itemId: string): Promise<boolean>
```

Rules:

- Host access is based on `DinnerRoom.hostId`.
- Guest access is based on `Guest.editToken`.
- Public share access is based on `DinnerRoom.isPublicShareable` and finalized status.

## 15. Realtime Plan

Realtime is optional for MVP, but strong for portfolio value.

### Events

- `guest.joined`
- `preference.updated`
- `plans.generated`
- `vote.cast`
- `plan.finalized`
- `shopping.item.updated`

### Client Behavior

When event arrives:

- Invalidate room query.
- Show toast notification.
- Update activity timeline.

### Simpler Alternative

If realtime causes delays, use polling every 10-15 seconds on room pages. Mention in README that realtime is future work.

## 16. UI/UX Direction

### Product Feel

The UI should feel like a polished collaboration tool, not a recipe blog.

Design principles:

- Clean dashboard layout
- Clear room status
- Strong visual hierarchy
- Compact cards
- Good mobile experience for guest form
- Minimal marketing language
- Actual app visible on first screen

### Suggested Palette

Avoid a one-note food-orange palette.

Use:

- Background: warm white or neutral gray
- Primary: deep green or teal
- Accent: tomato red or citrus yellow sparingly
- Text: near-black
- Status colors:
  - Green for finalized
  - Yellow for voting
  - Red for veto/warnings
  - Blue for info

### Key UI Details

- Use icons for actions:
  - Copy invite link
  - Vote
  - Veto
  - Shopping cart
  - Check item
  - Calendar
  - Users
- Use badges for dietary tags.
- Use progress indicators for room status.
- Use tooltips for less obvious controls.
- Use dialogs for destructive actions and finalization.

## 17. Folder Structure

```txt
TableSync/
  PROJECT_PLAN.md
  README.md
  package.json
  prisma/
    schema.prisma
    seed.ts
  src/
    app/
      (marketing)/
        page.tsx
      (app)/
        dashboard/
          page.tsx
        rooms/
          new/
            page.tsx
          [roomId]/
            page.tsx
            plans/
              page.tsx
            shopping/
              page.tsx
      join/
        [token]/
          page.tsx
      share/
        [roomId]/
          page.tsx
      demo/
        page.tsx
      api/
        auth/
          [...nextauth]/
            route.ts
    components/
      layout/
      rooms/
      menu/
      shopping/
      forms/
      ui/
    lib/
      auth.ts
      db.ts
      permissions.ts
      validations/
      menu-engine/
        generate-menu-plans.ts
        score-dish.ts
        constraints.ts
        types.ts
      shopping-engine/
        generate-shopping-list.ts
        assign-items.ts
        types.ts
      activity.ts
      realtime.ts
    styles/
      globals.css
  tests/
    unit/
      menu-engine.test.ts
      shopping-engine.test.ts
      permissions.test.ts
    e2e/
      room-flow.spec.ts
  .github/
    workflows/
      ci.yml
```

## 18. Testing Plan

### Unit Tests

Test recommendation logic:

- Allergy excludes unsafe dish.
- Vegetarian guest excludes meat dish.
- Gluten-free guest excludes wheat dish.
- Likes increase dish score.
- Dislikes reduce dish score.
- Over-budget plan is penalized.
- Vetoed ingredient creates warning.

Test shopping logic:

- Ingredient quantities scale by servings.
- Same ingredient merges correctly.
- Items group by category.
- Assignment balances cost.
- Guests who cannot bring are skipped.

### E2E Tests

Main Playwright flow:

1. Host signs in with test auth or mock session.
2. Host creates room.
3. Host copies invite link.
4. Guest joins through invite link.
5. Guest submits restrictions.
6. Host generates menu plans.
7. Guest votes.
8. Host finalizes plan.
9. Shopping list appears.
10. Guest claims item.
11. Guest checks item as purchased.

### CI Checks

Run on every push:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Optional:

```bash
npm run test:e2e
```

## 19. Deployment Plan

### Environment Variables

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

### Vercel Setup

1. Push repo to GitHub.
2. Import into Vercel.
3. Add environment variables.
4. Connect Supabase or Neon database.
5. Run Prisma migration.
6. Seed demo data.

### Production Commands

```bash
npm run build
npx prisma migrate deploy
npx prisma db seed
```

## 20. README Requirements

The README should be treated as part of the project, not an afterthought.

Required sections:

1. Project title and screenshot
2. Live demo link
3. Demo account or demo link
4. Problem statement
5. Feature list
6. Tech stack
7. Architecture diagram
8. Database schema overview
9. Recommendation engine explanation
10. Shopping list engine explanation
11. Local setup
12. Environment variables
13. Test commands
14. Deployment notes
15. Tradeoffs
16. Future work

### Example README Pitch

> TableSync is a collaborative dinner planning app for friend groups. A host creates a dinner room, invites guests to submit dietary restrictions and preferences, generates menu plans, collects votes, finalizes a menu, and turns the result into a shared shopping list with assignments.

## 21. Resume Bullets

Use bullets like these after the project is complete:

- Built a full-stack collaborative dinner planning platform with invite-based guest onboarding, dietary constraint handling, voting, menu generation, and shopping assignment workflows.
- Designed a constraint-based recommendation engine that filters dishes by allergies, dietary rules, budget, spice tolerance, and guest preferences before ranking menu plans.
- Implemented PostgreSQL data modeling with Prisma, role-based permissions for hosts and guests, activity timelines, and shareable public room pages.
- Added automated unit tests for menu and shopping engines plus Playwright E2E coverage for the host-to-guest planning flow.
- Deployed the app on Vercel with a managed PostgreSQL database and CI checks for linting, type safety, tests, and production builds.

## 22. Interview Talking Points

Be ready to explain:

1. Why this is not just an AI wrapper.
2. How guest edit tokens work.
3. How authorization differs between host, guest, and public viewer.
4. How the recommendation engine handles hard vs soft constraints.
5. Why the shopping assignment algorithm uses greedy balancing.
6. What data should be stored relationally vs JSON.
7. What you would change if the app had thousands of rooms.
8. How you would improve ingredient pricing.
9. How you would add realtime safely.
10. How you tested the critical workflow.

## 23. Stretch Features

Only add these after the MVP is solid.

### AI Menu Explanation

Use AI to explain why a menu plan fits the group.

Example:

> This plan avoids peanuts, keeps vegetarian options central, stays under budget, and includes mild spice alternatives.

### AI Dish Suggestions

Use AI to suggest new dish candidates, but still pass them through the deterministic constraint engine.

Important: Do not let AI bypass safety constraints.

### Calendar Export

Generate `.ics` calendar file for finalized dinner.

### Email Notifications

Send reminders:

- Guest has not submitted preferences.
- Voting is open.
- Shopping assignment is due.

### Price Integration

Let user manually set ingredient prices or integrate with a grocery API.

### Pantry Mode

Host enters ingredients they already have, reducing shopping list cost.

## 24. Key Risks and Controls

### Risk: Project becomes too large

Control:

- Keep MVP focused on one dinner room workflow.
- Avoid chat, payments, and grocery integrations.

### Risk: AI makes project look shallow

Control:

- Make deterministic workflow the core.
- Add AI only as optional explanation.

### Risk: Recommendation algorithm becomes too complex

Control:

- Use explainable scoring.
- Keep dish catalog small.
- Prioritize readable code over perfect recommendations.

### Risk: Guest auth becomes annoying

Control:

- Guests do not need accounts.
- Use secure edit tokens for guest updates.

### Risk: UI looks like a recipe blog

Control:

- Build dashboard and workflow UI.
- Avoid long recipe article pages.

## 25. Definition of Done

The project is job-search ready when:

- A recruiter can open the live demo and understand the app in 60 seconds.
- The GitHub README has screenshots, setup instructions, architecture, and test commands.
- The app has at least one complete demo room.
- The main workflow works without manual database edits.
- `npm run build` passes.
- Unit tests cover recommendation and shopping logic.
- One Playwright test covers the full host/guest/finalize flow.
- The codebase has clear folders and readable domain logic.
- Resume bullets can honestly describe the project as full-stack.
