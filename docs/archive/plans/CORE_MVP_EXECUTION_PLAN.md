# TableSync Core MVP Execution Plan

> Historical record. Status statements and verification results reflect the work recorded here. See the [archive index](../README.md) for context and current guides.

> **Scope update accepted (2026-09-08):** The five additional event types are implemented and locally accepted. [Seven-format planning contract](../../product/EVENT_FORMAT_EXPANSION.md) supersedes the original event-type restriction and records their behavior and passing evidence. The remaining safety, workflow, quality, and evidence standards below continue to apply.

**Status:** Core MVP and seven-format local acceptance passed; authoritative for maintenance and deferred-scope control
**Last updated:** 2026-09-08
**Owner:** TableSync project
**Supersedes:** The milestone ordering in `docs/archive/plans/PROJECT_PLAN.md` and `docs/archive/DEVELOPMENT_LOG.md` where they conflict with this document.

## 1. Purpose

This document is the maintained execution contract for the TableSync core MVP. The immediate priority is not authentication, deployment, marketing polish, or optional integrations. The priority is to prove that the complete product workflow works reliably from a new room with new data, that the domain rules are correct, and that the experience meets a high visual and interaction quality bar.

The core outcome is:

> A host can create a new gathering, invite guests to submit constraints, generate genuinely safe menu options, collect votes, finalize a menu, and generate, assign, and complete a shopping list without relying on a prebuilt demo room or manual database edits.

The seeded demo remains useful for discovery and demonstration, but it is not acceptable as proof that the product works.

## 2. Confirmed Product Decisions

These decisions were confirmed during the 2026-07-24 to 2026-08-01 product grilling session.

### 2.1 Supported event types

The current core supports:

- `DINNER`
- `HOTPOT`
- `POTLUCK`
- `BBQ`
- `PICNIC`
- `BRUNCH`
- `OTHER` (a shared buffet)

The five added formats have event-specific menu logic, suitable catalog dishes and complete browser workflow coverage. Their structures, Potluck contribution rules and final quality audit are maintained in the [Seven-format planning contract](../../product/EVENT_FORMAT_EXPANSION.md).

### 2.2 Safety and guest coverage

- An allergy is a global hard constraint. A dish containing an allergen declared by any guest cannot appear in a generated plan.
- Strict dietary requirements are evaluated as guest coverage rules rather than requiring every dish to be suitable for every guest.
- Every guest must have at least one safe main and one safe side in every accepted plan.
- A disliked ingredient lowers a score but does not make a dish unsafe.
- A dish with intrinsic spice above a guest's tolerance cannot count toward that guest's safe coverage.
- A dish with optional, separately served spice may remain eligible and must display a clear adjustment note.
- Dish data must be able to distinguish intrinsic spice from optional spice.

### 2.3 Budget

- Every normal top-three plan must be at or below the room's total budget.
- The engine must never silently relax the budget.
- If no safe in-budget plan exists, the result must say so explicitly.
- The closest over-budget plan may be shown only as a clearly labeled reference, including the exact overage, and must not be presented as an accepted plan.

### 2.4 Menu structures

#### Dinner

- 1-2 mains
- 2 sides
- Optional dessert
- 1 drink

#### Hotpot

- 1 broth that is safe for every guest
- A balanced combination of meat and/or plant-based proteins
- Vegetables, mushrooms, tofu, or similar hotpot ingredients
- 1 staple
- Dipping sauces
- 1 drink

Hotpot must use real event-specific generation logic. Renaming a generic dinner plan is not sufficient.

#### Added formats

Potluck uses shareable mains, sides and dessert with whole-dish contributions. BBQ requires grilled mains including a plant-based main. Picnic requires portable food. Brunch combines brunch mains, a savory side and fruit. Other is an explicit shared buffet with an appetizer. Exact slot counts, eligibility, portions and preparation rules are maintained in [Seven-format planning contract](../../product/EVENT_FORMAT_EXPANSION.md).

### 2.5 Workflow state machine

The core workflow is:

```text
COLLECTING_PREFERENCES -> VOTING -> FINALIZED
```

Rules:

- Entering `VOTING` closes guest joining and preference changes.
- Reopening preference collection invalidates all existing candidate plans and votes.
- `FINALIZED` closes voting and menu regeneration.
- Undoing finalization invalidates the generated shopping list and all shopping assignment or purchased state, then returns the room to `VOTING`.
- In Potluck, undoing finalization also clears contribution ownership and readiness. Changing a contributor rebuilds shared shopping atomically after confirmation; readiness changes preserve shopping progress.
- Any action that destroys derived work must require a clear user confirmation that names what will be lost.
- Invalid state transitions must fail without partially mutating data.

## 3. Current Baseline

The repository already has a working vertical slice with:

- Next.js App Router pages and Server Actions
- PostgreSQL persistence through Prisma
- Database migration and idempotent seed
- New-room creation
- Invite-based guest preference submission
- Constraint summary
- Deterministic menu generation
- Like, neutral, and veto voting
- Plan finalization
- Shopping generation, assignment, reassignment, and purchased state
- Activity timeline
- Public finalized-room view
- Unit, database integration, and Playwright smoke tests
- CI-backed type checking, tests, database setup, and production build

The baseline was broad but not yet deep enough. The following gaps were recorded at the start of execution and are retained here as historical input; Phases 1-5 below record which gaps have since been closed:

- Guest-specific coverage is not modeled correctly; a conflict with one guest currently removes a dish for everyone.
- Dinner and Hotpot do not yet have genuinely different generators.
- Budget is currently allowed to exceed the target by approximately 20%.
- Spice adjustability is not modeled.
- Veto reasons are not actually enforced.
- State transitions do not yet close or invalidate dependent workflow data consistently.
- The current E2E test browses seeded demo data instead of proving the fresh-room workflow.
- Visual, responsive, accessibility, interaction, and performance quality are not yet covered by a formal acceptance gate.

## 4. Scope Boundaries

### 4.1 In scope now

- Fresh-room Dinner and Hotpot workflows
- Domain model changes required by the confirmed rules
- Deterministic recommendation and conflict reporting
- Strict workflow state transitions and invalidation
- Shopping correctness and persistence
- Complete automated coverage of the core workflow and edge cases
- High-quality responsive UI for all core paths and states
- Accessibility, performance, error recovery, and interaction polish required by the acceptance standards
- Maintenance of this document and its evidence ledger

### 4.2 Deferred until the core acceptance gate passes

- Production OAuth and complete production authorization
- Realtime updates
- Payment collection
- Grocery price APIs
- Restaurant ordering
- Chat
- AI menu generation or AI explanations
- Public deployment
- Portfolio screenshots and marketing-focused README work

Deferred work must not distract from the core, but core changes must avoid designs that make later authentication or deployment unnecessarily difficult.

## 5. Execution Order

Work proceeds in dependency order. A later phase may start only when the relevant earlier invariants are implemented and tested.

### Phase 0 - Re-establish and record the baseline

Status: Complete (2026-08-01)

- Start from a clean database using the documented migration and seed path.
- Run the existing static checks, unit tests, database tests, build, and smoke test.
- Record failures as baseline evidence rather than working around them.
- Confirm that the seed is repeatable.
- Add the first entry to the evidence ledger.

Exit criterion: the current baseline is reproducible and its failures, if any, are documented.

Baseline evidence:

- `npx prisma validate`: passed.
- `npm run db:deploy`: passed; the existing migration was already applied.
- `npm run db:seed`: passed twice consecutively against the configured local Prisma PostgreSQL instance.
- `npm run lint`: passed after generated E2E build output was explicitly excluded.
- `npm run typecheck`: passed after the standalone check was made non-incremental so it does not depend on a stale, unwritable local cache file.
- `npm run test`: 2 files and 8 tests passed.
- `npm run test:db`: 1 file and 2 tests passed.
- `npm run build`: passed with all current routes built successfully.
- `npm run test:e2e`: 1 Chromium smoke test passed against a production Next.js server and the command exited cleanly.
- Initial baseline failures were preserved and diagnosed: the configured local Prisma database was not running; the original typecheck attempted to overwrite a stale `tsconfig.tsbuildinfo`; the original development-server E2E path could not acquire its `.next` lock; and Windows `npx` shell wrappers remained alive after successful tests. The database was restarted, typecheck was made deterministic, and the E2E runner now directly invokes local Next and Playwright CLIs against the production build.
- The current E2E coverage remains intentionally classified as insufficient for Goal completion because it only browses the seeded demo room and only runs Chromium.

### Phase 1 - Make the domain model express the confirmed rules

Status: Complete (2026-08-01)

- Original milestone: limit exposed event types to Dinner and Hotpot. Superseded by the seven-format expansion on 2026-09-08.
- Model event-specific menu roles without overloading generic display labels.
- Model intrinsic versus optional spice.
- Define plan-level per-guest safety coverage.
- Define explicit generation outcomes for accepted plans and no-solution reports.
- Encode the allowed room state transitions and invalidation behavior behind a small domain interface.
- Add and apply any required Prisma migration and update the idempotent seed.

Exit criterion: the model can represent every confirmed rule without relying on UI-only assumptions or ambiguous strings.

Completion evidence:

- Added and applied explicit migrations for `spiceAdjustable`, Hotpot menu roles, persisted generation reports, workflow activity types, and deterministic shopping order.
- Added guest-specific safety evaluation that separates global allergy conflicts from personal diet and intrinsic-spice conflicts.
- Added deterministic plan-level coverage output with safe main and side dish IDs for every guest.
- Added optional-spice adjustment warnings and scoring penalties without treating an adjustable dish as unsafe.
- Added first-class `success` and `no-solution` generation outcomes; an invalid or over-budget reference is never persisted as a votable plan.
- Added a small workflow state-machine interface used by the persistence layer for every state-sensitive mutation.

### Phase 2 - Rebuild recommendation correctness with tests first

Status: Complete (2026-08-01)

- Implement global allergy exclusion.
- Implement per-guest main and side coverage.
- Implement intrinsic and optional spice behavior.
- Make dislikes a soft penalty only.
- Enforce the hard room budget.
- Generate Dinner plans using the confirmed Dinner structure.
- Generate Hotpot plans using the confirmed Hotpot structure.
- Return precise no-solution reasons and affected guests.
- Provide a clearly separated closest-over-budget reference only when no accepted plan exists.
- Keep scoring deterministic for identical inputs.

Exit criterion: generated accepted plans satisfy all safety, coverage, structure, and budget invariants under normal and adversarial fixtures.

Completion evidence:

- Replaced group-wide diet exclusion with global allergy exclusion plus guest-specific coverage.
- Added a deterministic Dinner generator with 1-2 mains, exactly 2 sides, 1 drink, optional dessert, per-guest main-and-side coverage, optional-spice notes, and a hard budget filter.
- Added a dedicated deterministic Hotpot generator with exactly 1 broth, 2 proteins, 2 vegetables, 1 staple, 2 sauces, and 1 drink; the shared broth is safe for every guest and personal coverage is enforced.
- Added bounded candidate pools and precomputed safety, preference, and score lookups so the richer generators remain practical.
- Added precise no-solution issue codes, affected guests, persisted conflict reporting, and a clearly separated closest-over-budget reference.
- Added adversarial unit coverage for allergies, mixed diets, guest coverage, intrinsic and adjustable spice, structure, hard budget, determinism, and no-solution behavior.

### Phase 3 - Enforce the workflow state machine

Status: Complete (2026-08-01)

- Close guest joining and preference edits in `VOTING` and `FINALIZED`.
- Close voting and regeneration in `FINALIZED`.
- Add reopen-preferences behavior that atomically removes plans and votes.
- Add undo-finalization behavior that atomically removes shopping data and returns to `VOTING`.
- Enforce Veto reason requirements.
- Reject invalid and duplicate transitions without partial writes.
- Record meaningful activity events only after successful transitions.
- Add UI confirmation for destructive transitions.

Exit criterion: all state transitions and their failure paths are covered by domain and database tests, with no stale dependent data.

Completion evidence:

- Enforced join, generate, vote, finalize, shopping, reopen, and undo permissions in the persistence layer.
- Enforced non-empty Veto reasons and rejected unchanged vote and shopping mutations.
- Reopening preferences atomically deletes plans and votes; undoing finalization atomically deletes all shopping rows and returns the room to voting.
- Added explicit confirmation controls naming the derived data lost by each destructive transition.
- Added state-machine unit tests and database integration coverage for successful workflows, invalid transitions, and invalidation.

### Phase 4 - Prove shopping correctness

Status: Complete (2026-08-01)

- Generate shopping only from a finalized accepted plan.
- Scale quantities using the actual guest count, with the documented fallback to expected guests.
- Merge only compatible ingredient units.
- Preserve category grouping and deterministic ordering.
- Assign automatically only to guests who can bring items.
- Keep manual reassignment rules consistent with the product decision.
- Preserve cost-balancing behavior and explain its limits.
- Ensure regeneration or undo-finalization cannot preserve stale assignments or purchased state.

Exit criterion: shopping totals, quantities, assignments, invalidation, and persistence pass unit and database integration tests.

Completion evidence:

- Removed double cost scaling and based quantities on actual joined guests with the expected-guest fallback.
- Restricted merging to identical ingredient-and-unit pairs and preserved deterministic category/display ordering with persisted `sortOrder`.
- Auto-assignment considers only guests who can bring items and leaves rows unassigned when no eligible guest exists.
- Database tests cover shopping generation and stale-data invalidation; fresh-room E2E covers purchased-state persistence after reload.

### Phase 5 - Complete fresh-room end-to-end coverage

Status: Complete (2026-08-01)

- Add a Dinner E2E scenario starting from a new room.
- Add a Hotpot E2E scenario starting from a new room.
- Include guests with an allergy, a strict diet, a low spice tolerance, dislikes, and different shopping availability.
- Verify accepted menu structure, safety coverage, and budget.
- Exercise Like, Neutral, Veto with required reason, finalization, shopping reassignment, and purchase completion.
- Exercise invalid state actions and destructive confirmation paths.
- Reload pages and restart the application or database connection boundary to prove persistence.
- Do not use the seeded finalized demo room as the test subject.

Exit criterion: both event workflows pass from a clean database with no manual data editing.

Completion evidence:

- Added fresh-room Dinner, Hotpot, and persisted no-solution Playwright scenarios; the seeded demo remains only a separate smoke test.
- The final production-build matrix passed 15/15 tests: five scenarios each in Chromium, Firefox, and WebKit.
- Dinner and Hotpot both cover new-room creation, two contrasting guests, allergy, strict diet, low spice tolerance, dislikes, different shopping availability, exact event structure, Like, Neutral, Veto with reason, finalization, manual shopping reassignment, purchased-state persistence, and destructive recovery.
- Preference edits use private edit tokens, persist before voting, and become read-only in voting/finalized states. Repeated joins use a persisted idempotency key.
- Database coverage rejects wrong-host finalization and generation, invalid transitions, unchanged mutations, late joins, and cross-state actions without partial writes.
- Every final acceptance flow started from application UI and used no manual database edits.

### Phase 6 - Reach the visual and interaction quality bar

Status: Complete (2026-08-01)

- Establish a coherent visual system for spacing, typography, colors, radii, borders, elevation, icons, and motion.
- Make all core pages responsive at narrow mobile, tablet, laptop, and wide desktop sizes.
- Provide polished default, hover, active, focus, disabled, pending, success, empty, warning, validation, and failure states.
- Give every mutation immediate feedback and prevent accidental double submission.
- Preserve user input when recoverable failures occur.
- Make destructive consequences explicit before confirmation.
- Ensure navigation, forms, voting, and shopping work with keyboard only.
- Respect reduced-motion preferences.
- Remove layout shifts, clipping, overlap, horizontal overflow, inconsistent alignment, and ambiguous controls.
- Perform visual review on real rendered pages, not source inspection alone.

Exit criterion: the visual acceptance matrix passes and there are no known reproducible visual or interaction defects on core paths.

Completion evidence:

- Added consistent pending, disabled, success, recoverable error, empty, loading, not-found, warning, and destructive-confirmation states.
- Added skip navigation, visible focus treatment, reduced-motion behavior, responsive navigation, and at least 44 x 44 CSS-pixel primary controls.
- Automated Axe scans reported zero violations on the audited core/public states; keyboard navigation and reduced-motion assertions passed in the browser matrix.
- Automated overflow and touch-target checks passed at 375 x 812, 768 x 1024, and 1440 x 900.
- Captured and visually reviewed 36 screenshots under `docs/evidence/screenshots/`: 12 core states at each required viewport, including Dinner, Hotpot, no-solution, finalized, shopping, and both destructive confirmations.
- A screenshot-based regression exposed a 36-pixel shopping save target; the control now has a fixed 44-pixel minimum and the full quality scenario passes.

### Phase 7 - Final acceptance and evidence package

Status: Complete (2026-08-01)

- Run every required command from a clean state.
- Run the full E2E suite in all supported Playwright browser projects.
- Capture the required viewport screenshots for each core page and important state.
- Run accessibility and production performance audits.
- Review console, server, test, and database output for hidden warnings or errors.
- Re-run the seed and fresh-room flows to prove repeatability.
- Review the final diff for accidental scope expansion and unrelated changes.
- Update this document's status, phase statuses, evidence ledger, remaining risks, and follow-up work.

Exit criterion: every mandatory acceptance standard below is satisfied with recorded evidence.

Completion evidence:

- Final command results: Prisma validation passed; 7 migrations were present with none pending; seed passed twice consecutively; lint and typecheck passed; 28/28 unit tests passed; 3/3 PostgreSQL integration tests passed both before and after the final browser run; production build passed; and the three-browser E2E matrix passed 15/15.
- Final browser runs retained a zero-error gate for console errors, page errors, failed mutation responses, hydration failures, and unexpected server errors.
- Lighthouse 13.4.1 production-build medians passed the unchanged mobile thresholds: Home Performance 91, Accessibility 100, Best Practices 100, CLS 0; Demo Performance 95, Accessibility 100, Best Practices 100, CLS 0.0548. Reports are stored under `docs/evidence/lighthouse/`.
- `git diff --check` passed; only existing Windows LF-to-CRLF conversion notices were reported. The final scope remains limited to core behavior, verification, and maintained evidence.
- No P0, P1, P2, or reproducible acceptance-path P3 defect remains known on the exercised surfaces.

## 6. Mandatory Acceptance Standards

These standards are gates, not aspirations. A phase or Goal cannot be declared complete because the feature appears to work manually.

### 6.1 Functional correctness

- Dinner and Hotpot both complete the full fresh-room workflow without relying on demo-room state.
- Every accepted plan obeys the exact event structure.
- Every accepted plan is at or below budget.
- Every accepted plan contains no declared allergen.
- Every guest has at least one safe main and one safe side.
- No-solution cases identify the blocking rule and affected guests without misrepresenting an invalid plan as accepted.
- All state transitions and invalidations match Section 2.5.
- Shopping is derived only from the current finalized plan and contains no stale rows.
- Reloading and restarting does not lose committed workflow state.
- There are no manual database edits in an acceptance run.

### 6.2 Automated verification

All of the following must pass from the repository root:

```bash
npx prisma validate
npm run db:deploy
npm run db:seed
npm run lint
npm run typecheck
npm run test
npm run test:db
npm run build
npm run test:e2e
```

Additional requirements:

- The seed passes when run more than once.
- Tests must be deterministic and isolated.
- No focused, skipped, or quarantined core acceptance tests remain without an explicitly documented external blocker.
- Every fixed defect receives a regression test at the lowest useful level.
- Core domain branches include allergies, strict diets, coverage failure, intrinsic and optional spice, dislikes, hard budget, Dinner structure, Hotpot structure, no-solution reporting, invalid state transitions, invalidation, and shopping regeneration.

### 6.3 Visual quality

The following viewports are mandatory review points:

- Mobile: 375 x 812
- Tablet: 768 x 1024
- Desktop: 1440 x 900

At each viewport, every core page and important state must have:

- No horizontal overflow, clipped content, overlapping elements, broken wrapping, unstable layout, or unintended scroll traps.
- Clear hierarchy and consistent alignment, spacing, typography, color, iconography, controls, and card treatment.
- Legible content without zooming.
- Touch targets of at least 44 x 44 CSS pixels for primary interactive controls.
- Visible keyboard focus and a logical focus order.
- Clear inline validation and recoverable error messages.
- Distinct empty, loading or pending, disabled, success, warning, and failure states.
- No raw technical errors, internal IDs, stack traces, placeholder copy, or misleading enabled controls.
- No accidental double submissions.
- No known reproducible visual defects on the acceptance paths.

Visual evidence must include screenshots or traces for the new-room form, guest join form, constraint summary, Dinner plans, Hotpot plans, voting, no-solution state, finalized plan, shopping workflow, and destructive confirmations.

### 6.4 Accessibility

- Core paths meet WCAG 2.2 AA expectations.
- Automated accessibility scans report zero serious or critical violations on core pages.
- Forms have programmatic labels, useful error association, and understandable instructions.
- Status is never communicated by color alone.
- Contrast meets AA thresholds.
- Keyboard-only users can complete the full core workflow.
- Motion respects `prefers-reduced-motion`.

### 6.5 Performance and fluidity

Production-build audits on representative public and core pages must achieve, using the median of three consistent local runs:

- Lighthouse Performance: at least 90
- Lighthouse Accessibility: at least 95
- Lighthouse Best Practices: at least 95
- Cumulative Layout Shift: below 0.1

Interaction requirements:

- A user action receives visible pending acknowledgement within 100 ms.
- Long-running actions keep the interface responsive and explain what is happening.
- Normal navigation and mutation flows do not exhibit avoidable flicker, full-page instability, duplicate loading, or stale results.
- No uncaught browser errors, React hydration errors, unhandled promise rejections, or unexpected server errors occur during acceptance flows.

If a metric cannot be measured reliably in the local environment, the evidence ledger must record the attempted method, reason, best available evidence, and production recheck requirement. It must not be silently marked as passed.

### 6.6 Reliability and data integrity

- Multi-record state transitions are atomic.
- Failed operations leave persisted state unchanged.
- Retry or double-submit behavior does not create duplicate guests, votes, plans, activities, or shopping rows.
- Cross-room identifiers cannot corrupt another room's data, even before full production authentication is implemented.
- Empty catalogs, missing rooms, invalid invite tokens, expired or unsupported states, database failures, and no-plan outcomes have explicit behavior.
- The application recovers cleanly after a failed mutation and provides the user a next action.

### 6.7 Defect bar

Completion requires:

- Zero known P0 defects: data loss, corruption, unsafe allergy result, or unusable application.
- Zero known P1 defects: broken core workflow, incorrect state transition, invalid budget acceptance, or missing guest safety coverage.
- Zero known P2 defects on core paths: prominent visual breakage, inaccessible interaction, repeatable error, severe confusion, or major performance regression.
- Zero known reproducible P3 visual defects in the required acceptance screenshots.
- Any unresolved external limitation is explicitly documented with evidence and cannot contradict the functional correctness requirements.

“No known defects” means the defined automated and manual acceptance surfaces were exercised and no reproducible defect remains; it is not a claim that untested software can be mathematically bug-free.

## 7. Evidence and Maintenance Protocol

This file must be updated throughout implementation, not only at the end.

After each coherent milestone:

1. Update the relevant phase status.
2. Record the date and the exact change.
3. Record commands and results, including failures.
4. Link generated screenshots, traces, reports, migrations, or tests.
5. List the next highest-risk unmet acceptance item.
6. Keep deferred work separate from blockers.
7. Update `docs/archive/DEVELOPMENT_LOG.md` with a concise delivery summary.

Do not weaken an acceptance criterion merely because it is difficult. If a criterion is impractical or incorrect, record the evidence and obtain an explicit product decision before changing it.

### Evidence ledger

| Date | Phase | Change or experiment | Evidence | Result | Remaining risk / next action |
| --- | --- | --- | --- | --- | --- |
| 2026-08-01 | Planning | Confirmed core scope and high-quality acceptance contract | This document | Complete | Re-establish the executable baseline |
| 2026-08-01 | Phase 0 | Re-established schema, database, seed, static, unit, integration, build, and browser baseline; hardened typecheck and E2E process lifecycle | Prisma validate; deploy; seed x2; lint; typecheck; 8 unit tests; 2 database tests; production build; 1 Chromium smoke test | Complete | Begin per-guest safety coverage and event-specific domain modeling; fresh-room E2E and browser matrix remain missing |
| 2026-08-01 | Phases 1-2 | Added persisted spice adjustability, per-guest safety and coverage, strict Dinner generation, bounded scoring, and batched plan persistence | New migration; 8 menu tests; 4 shopping tests; 2 database tests; lint; typecheck; production build; E2E; database test rerun after E2E | Partial milestone passed | Build Hotpot role model and generator; redesign no-solution output so invalid placeholders are never persisted as plans |
| 2026-08-01 | Phases 1-2 | Completed Hotpot role modeling/generation and first-class persisted no-solution reporting | Role and report migrations; expanded menu tests; fresh-room UI assertions | Complete | Enforce every workflow transition and invalidation atomically |
| 2026-08-01 | Phases 3-4 | Added persistence-backed workflow guards, required Veto reasons, destructive recovery, shopping integrity, deterministic ordering, and invalidation | State-machine tests; 3 database tests; shopping tests; fresh-room reload assertions | Complete | Repeat fresh-room browser suite after pending-state fix; close authorization and edit gaps |
| 2026-08-01 | Phases 5-6 | Added 3 fresh-room acceptance scenarios and pending/disabled mutation feedback; diagnosed and recovered an unstable experimental local database proxy without weakening assertions | One 4/4 Chromium pass; Prisma deploy/seed and 3/3 database tests after clean proxy restart; lint/typecheck after interaction changes | In progress | Re-run production E2E; add preference edit, ownership, accessibility, viewport, browser-matrix, and performance evidence |
| 2026-08-01 | Phases 5-6 | Closed guest edit/idempotency, host ownership, recoverable mutation, responsive, keyboard, touch-target, reduced-motion, accessibility, and console-error gaps | 36 viewport screenshots; Axe scans; fresh-room Dinner/Hotpot/no-solution flows; Playwright 1.62.1 browser matrix | Complete | Run final clean command set and performance gate |
| 2026-08-01 | Phase 7 | Completed final core acceptance without weakening the documented thresholds | Validate; 7 migrations; seed x2; lint; typecheck; 28/28 unit; 3/3 DB before and after E2E; build; 15/15 E2E; Lighthouse medians Home 91 and Demo 95; Accessibility/Best Practices 100; CLS below 0.1 | Complete | Keep deferred production work separate; re-run production-only dependency audit in an explicitly authorized environment |

### Seven-format expansion acceptance (2026-09-08)

All seven formats passed complete fresh-room workflows across Chromium, Firefox and WebKit. Final evidence includes 228 unit tests, 31 database tests, 46 applicable browser passes with five intentional skips, 81 added-format responsive screenshots, schema validation/current 13 migrations/two idempotent seeds, lint/typecheck/build, and Lighthouse performance medians of 97 (Home), 95 (Auth) and 93 (private Potluck). All nine final audit runs scored Accessibility/Best Practices 100 and CLS 0. The [expansion contract](../../product/EVENT_FORMAT_EXPANSION.md) retains failed iterations, final evidence and local database/performance scope limits.

### Recorded external limitations and deferred work

- The experimental local `prisma dev` TCP proxy can terminate connections after repeated high-volume suites. Final evidence was gathered after a clean named-server restart, and the database suite also passed after the final 15-test E2E run. Hosted PostgreSQL remains the required production recheck environment.
- `npm install` reported 11 advisories across the complete dependency tree (5 moderate, 6 high). A production-only `npm audit --omit=dev` could not be classified because the environment rejected sending dependency metadata to npm's public audit API. This does not invalidate the functional acceptance evidence, but a production-only audit remains mandatory before deployment and must be run only with explicit authorization or in trusted CI.
- Lighthouse 13.4.1 declares Node.js 22.19 or newer. The exact `npm run audit:performance` command passed in this environment on Node 22.14, and the same audit also passed on bundled Node 24.14; local/CI runtimes should be upgraded to a supported Node release before future evidence refreshes.
- Production OAuth, complete production authorization, realtime behavior, managed deployment, AI, payments, and portfolio packaging were intentionally deferred at this milestone. The additional event types were implemented in the 2026-09-08 expansion.

## 8. Completion Report Requirements

The final completion report must include:

- A concise statement of the achieved user outcome.
- Files and migrations changed.
- Exact verification commands and their final results.
- Unit, database integration, and E2E coverage added.
- Visual evidence paths for all required viewports and states.
- Accessibility and performance evidence.
- Confirmation that the workflow started from a new room on a clean database.
- Confirmation that Dinner and Hotpot both passed.
- Confirmation that no P0-P3 acceptance-path defects remain known.
- Remaining deferred work and any explicitly accepted limitations.

If work becomes genuinely blocked after reasonable alternatives are exhausted, the report must instead include attempted paths, gathered evidence, exact blocker, affected acceptance criteria, current repository state, and the smallest user decision or external input needed to proceed.
