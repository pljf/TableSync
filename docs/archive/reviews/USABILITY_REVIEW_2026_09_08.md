# Feature testing and improvement assessment — September 8, 2026

> Historical record. Status statements and verification results reflect the work recorded here. See the [archive index](../README.md) for context and current guides.

## Fresh verification

Reran the existing production build in Chromium: **13/13 browser cases passed in 2.7 minutes**. The temporary test rooms were removed by the runner. No application code or product behavior was changed during this assessment.

- All seven meal formats completed fresh-room workflows: creation, guest preferences, menu generation, Like/Neutral/Veto voting, finalization, shopping, sharing, and relevant undo/reopen recovery.
- Potluck additionally exercised guest claims/readiness, host assignment, independent drafts, all-contributed shopping, release, and public privacy.
- Budget/no-solution recovery, anonymous account isolation, session security, logout, failed-entry retry, keyboard cancellation, pending/error feedback, and reduced motion passed.
- The workflow captures responsive evidence at 375×812, 768×1024, and 1440×900 and checks accessibility and layout. The current Dinner voting and mobile finalized screens were also visually inspected.

Two independent subagents reviewed product behavior and implementation without editing the application. Firefox/WebKit, database, unit, and Lighthouse results in the earlier integrated review remain earlier evidence; those suites were not rerun for this assessment. No new blocking failure surfaced in the fresh cases. The recommendations below address confirmed limitations and usability tradeoffs.

## 1. Preserve shopping progress when contributions change

**Current behavior:** Changing any Potluck contribution owner requires confirmation, then deletes and recreates the entire shared shopping list. This also applies to transferring an already-contributed dish from one willing guest to another, although the shared ingredients have not changed. The warning is accurate, but the reset creates avoidable work.

**Proposed approach:** Start by preserving shopping entirely on contributor-to-contributor transfers, while resetting the transferred dish's readiness. For claim/release actions, compare old and new grocery requirements and update affected ingredient quantities only. Retain unchanged item IDs, assignments, and purchase checks. Preview affected progress and request confirmation when a purchased item's quantity or inclusion changes.

**Acceptance:** A→B transfers preserve all shopping; claiming dessert does not clear purchased vegetables for another dish; changed shared-ingredient quantities are explicit; authorization, simultaneous claims, and transaction rollback still pass.

Evidence: `src/lib/store.ts` (`assignPotluckContribution`, confirmation at line 1236 and complete rebuild at line 1253); `tests/database/potluck.test.ts`.

## 2. Make the menu decision easier

**Current behavior:** The tested Dinner screen contains three cards titled “Shared Dinner Plan,” each with an 87 score and the same summary. They differ in side dishes and cost ($47, $45, $51), but those differences require scanning each full list. The score has no user-facing explanation.

**Proposed approach:** Give options descriptive names based on their distinctive dishes or differences. Add a compact comparison of total cost, dishes that change, portions, and participation in voting. Explain the preference score using actual scoring inputs, and keep safety constraints separate from subjective preference matching. On mobile, make the differences visible near the top of each option.

**Acceptance:** Similar menus remain easy to distinguish; names are deterministic; all displayed cost/preference claims derive from current data; keyboard and small-screen comparison remain usable.

Evidence: `src/lib/menu-engine/generate-menu-plans.ts:253`, `src/components/menu/menu-plan-card.tsx:56`, and `docs/evidence/screenshots/desktop-1440x900/dinner-voting.png`.

## 3. Make guest work easier to keep and revisit

**Current behavior:** Guest host access lasts up to seven days in the same browser and has no visible account-saving path. The auth page redirects an already signed-in guest to the dashboard, despite the existing account-transfer hook. Separately, submitting a meal response in a second room replaces the single active participant session for the first room. Both limitations are explained in the UI.

**Proposed approach:** Add an optional **Save my rooms** action that upgrades the current anonymous account through a verified identity provider while retaining its rooms. Keep immediate guest entry available. Then support multiple room memberships under a secure browser identity, resolving the participant from the requested room instead of one global active response. Optional, unverified email text must never establish ownership or recovery rights.

**Acceptance:** Successful upgrades retain every room; failed upgrades retain guest access; joining room B preserves room A's response; another browser cannot claim those memberships; logout, expiry, revocation, and replay protections remain intact.

Evidence: `src/lib/guest-session.ts:21`, `src/app/join/[token]/page.tsx:54`, `src/app/auth/page.tsx:17`, and the anonymous account-transfer hook in `src/lib/auth.ts`.

## 4. Keep group views current

**Current behavior:** Saving a mutation refreshes the submitting browser. Source inspection found no room subscription, periodic refresh, or refresh-on-return behavior for other participants. Other open views can remain stale until navigation or reload.

**Proposed approach:** Add a private room-version check and poll modestly while the page is visible, for example every 5–10 seconds, plus when the user returns to the tab. Increment the version transactionally with room changes. Refresh clean forms automatically; show **New updates available** when refreshing could disturb an unsaved draft. A realtime connection can follow if actual usage justifies it.

**Acceptance:** Two browsers see votes, assignments, and readiness updates; local drafts survive; hidden tabs stop polling; expired and unrelated sessions cannot read room state.

Evidence: `src/components/ui/mutation-form.tsx:95`, `src/components/menu/vote-form.tsx`, and the absence of a room update subscription in `src/`.

## 5. Give a finalized meal a preparation view

**Current behavior:** The finalized mobile Plans page still displays all three full alternatives. The state message mentions shopping, but the panel has no prominent forward action. Dish records have ingredients and prep time but no cooking steps; detailed ingredients currently appear in Potluck contributions only.

**Proposed approach:** Lead with the selected menu and collapse unselected options. Add prominent **Open shopping** and **Prepare this menu** actions. First expose scaled ingredients, portions, prep time, and existing adjustment notes for every format. Add curated cooking steps and a practical preparation checklist as a separate content/schema increment.

**Acceptance:** The selected menu and next action are obvious on a phone; archived alternatives remain inspectable; recipe quantities match the finalized servings and shopping engine; missing cooking instructions are clearly represented rather than invented.

Evidence: `src/app/rooms/[roomId]/plans/page.tsx`, `src/components/menu/potluck-contributions.tsx:45`, `prisma/schema.prisma:176`, and `docs/evidence/screenshots/mobile-375x812/finalized-plan.png`.

## Recommended order

Begin with contribution-transfer progress preservation and clearer menu comparisons. They directly reduce lost work and decision effort. Follow with the finalized preparation layout, optional account saving, and group update freshness. Multi-room participant identity and curated cooking content need their own bounded migrations and acceptance work.

Before inviting people on other devices, provide an HTTPS deployment backed by real PostgreSQL and complete the existing deployment checks. The current localhost preview is for local testing; its development database has documented limits when multiple app processes query it concurrently.
