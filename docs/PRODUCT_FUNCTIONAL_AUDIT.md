# TableSync Product Functional Audit

> Historical September 2 audit below. The September 7 review found additional defects that these checks did not cover; current repairs, limitations, and verification are recorded in [`REVIEW_2026_09_07.md`](REVIEW_2026_09_07.md).

**Audit date:** 2026-09-02  
**Scope:** Confirmed Dinner and Hotpot core MVP in `CORE_MVP_EXECUTION_PLAN.md`  
**Result:** Pass for the complete local core workflow; external staging evidence remains explicitly open

## Audit method

The audit combined source and route inventory, production-build browser tests, PostgreSQL integration tests, unit tests, rendered-page inspection, accessibility checks, responsive screenshots, and static/build/security gates. The seeded demo was used only for rendered inspection; the acceptance flows create fresh Dinner, Hotpot, and no-solution rooms through the product UI.

## Function-by-function result

| Area | Pages or boundary | Result | Evidence and behavior checked |
| --- | --- | --- | --- |
| Discovery and navigation | `/`, `/demo`, shared header, room tabs | Pass | Primary destinations render; room navigation is consistent and indicates the active section. |
| Authentication recovery | `/auth`, Better Auth actions and callback errors | Pass locally | Sign-in initiation, callback failure, sign-out failure, session denial, and CI-only identity boundaries have automated coverage. Real GitHub OAuth still requires staging credentials. |
| Dashboard | `/dashboard` | Pass | Room cards render for authenticated hosts; the zero-room state gives a clear next action. |
| Room creation | `/rooms/new` | Pass | Valid Dinner/Hotpot rooms redirect to their overview; invalid or rate-limited submissions stay on the form with recoverable inline feedback and preserved input. |
| Guest invitation and preferences | `/join/[token]`, `/preferences` | Pass | Idempotent join, private session issuance, editing during collection, bounded fields, invalid/expired access, and read-only post-collection behavior are covered. |
| Constraint summary | `/rooms/[roomId]` | Pass | Diet, allergy, likes, guest budget, and spice summaries handle both populated and empty rooms without misleading defaults. |
| Menu generation | `/rooms/[roomId]/plans` | Pass | Dinner and Hotpot structures, guest safety coverage, hard budgets, no-solution reports, and deterministic output are covered. Alternatives now prioritize materially different core menus instead of drink-only variants. |
| Voting | plan cards and vote actions | Pass | Like, Neutral, and required-reason Veto persist correctly; the current vote is visible and button state is exposed accessibly; non-Veto votes cannot retain stale reasons. |
| Workflow transitions | collection, voting, finalization, reopen, undo | Pass | Invalid transitions are rejected atomically; destructive transitions name and clear dependent plans, votes, or shopping data as required. |
| Shopping generation | `/rooms/[roomId]/shopping` | Pass | Finalized-plan-only generation, quantity/cost merge rules, deterministic grouping, eligible assignment, reassignment, purchase persistence, and invalidation are covered. |
| Shopping operation | shopping controls | Pass | Assignment totals and All, Mine, Unassigned, and Purchased filters work; empty and singular states use accurate copy. |
| Public sharing | `/share/[roomId]` | Pass | A public link appears only for a public finalized room with a selected plan; the read-only page exposes only the final menu and shopping summary. |
| Authorization and abuse boundaries | data loaders, actions, `/api/auth/*`, Server Actions | Pass locally | Anonymous/private reads, wrong-host and wrong-room IDs, impersonation, cross-origin actions, rate limits, redacted audit data, and security headers are covered. |
| Error, empty, pending, and accessibility states | all core routes | Pass | Mutation feedback, double-submit protection, empty states, keyboard focus, reduced motion, Axe checks, touch targets, and overflow assertions pass. |
| Responsive presentation | 375x812, 768x1024, 1440x900 | Pass | The automated suite captures 36 screenshots across 12 states; no audited overflow or touch-target regression is present. |

## Defects closed during this audit

- Removed pre-finalization Share links that led to a 404.
- Replaced misleading fresh-room counts and the empty-room “Hot” spice default with accurate state-aware copy.
- Added an explicit guest-list empty state and a useful zero-room dashboard state.
- Made plan and shopping calls to action match Collecting, Voting, and Finalized status.
- Displayed the current guest vote, exposed selected vote buttons with `aria-pressed`, and prevented stale Veto reasons on Like/Neutral votes.
- Converted room creation failures into recoverable inline form errors and added strict date validation and input length bounds.
- Added reusable room-section navigation with active-page semantics.
- Removed misleading zero-value shopping metrics before a list exists.
- Added shopping assignment totals and All, Mine, Unassigned, and Purchased filters, including no-match feedback.
- Corrected singular shopping copy (`1 item`).
- Diversified top menu recommendations by core meal composition and gave Hotpot options descriptive titles.
- Stabilized Dinner/Hotpot dish ordering in plan and share views and corrected singular serving copy (`1 serving`).

## Verification ledger

- `npx prisma validate`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: 47/47 passed across 8 files.
- `npm run test:db`: 8/8 PostgreSQL tests passed.
- `npm run build`: passed for all 14 routes.
- Complete production-build Playwright matrix, run in two attributed batches: 16 passed and 5 intentionally skipped across Chromium, Firefox, and WebKit.
- `npm run security:secrets`: passed.
- `npm run security:evidence`: passed.
- Rendered inspection: overview, plan, shopping, filter interaction, and finalized public share pages passed against the local production server.

## Open external evidence, not claimed complete

These items do not block the confirmed local core workflow, but they remain required before claiming remote production readiness:

- real GitHub OAuth callback, persistence, logout, and revocation evidence;
- managed PostgreSQL TLS/role validation and backup/restore rehearsal;
- a real HTTPS deployment, deployment log review, rollback exercise, remote browser matrix, and staging Lighthouse run;
- a production dependency audit in an environment explicitly authorized to send package metadata to npm.

The experimental local Prisma development proxy can become unhealthy after prolonged multi-browser load. This audit recovered the named server without resetting data and reran the database and browser gates. Managed staging must use a real PostgreSQL service and is the authoritative environment for connection-stability evidence.
