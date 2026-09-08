# Collaboration reliability update

Date: 2026-09-08  
Status: implemented and locally verified. Deployment remains with the project owner.

## Problem and result

Guests could lose access to an earlier meal response when joining another room in the same browser. Other participants' changes required manual refresh, Potluck contribution edits discarded unrelated grocery progress, and finalized menus continued to compete visually with unused options.

This update keeps the original green-and-cream design and addresses those interruptions across the existing planning workflow.

## Current behavior

### Browser identity and room access

- Each room has its own saved meal-response session. Joining a second room preserves access to the first room's preferences and participation.
- Room-specific preferences links and server-side actions select the verified participant for the relevant room. A host account remains separate from its meal-response identities.
- **Save my rooms** links the current browser host account to GitHub when OAuth is configured, providing a return path to existing rooms across devices. Real GitHub callback and deployment validation remain pending.
- Different participants in the same room still use separate browser profiles or devices. Unlinked anonymous host accounts remain dependent on their browser session.

### Shared room updates

Visible room pages check for changes every eight seconds. A changed revision refreshes the displayed room state while protecting active edits and unsaved form drafts. The initial revision is read before the room bundle so a change between rendering and browser hydration is still detected.

This provides periodic updates for preferences, votes, contribution ownership/readiness, and shopping progress. It does not promise immediate delivery. Host and guest permissions continue to govern access to every room.

### Potluck grocery continuity

Claims and releases recalculate only the shared groceries still needed. The finalized menu, dish portions, votes, and total food budget remain fixed.

| Grocery change | Result |
| --- | --- |
| Same ingredient and unit; quantity unchanged or reduced | Keep the row, assignment, and purchase check |
| Quantity increased | Keep the assignment; create a new unchecked row and reject submissions against the old row |
| Ingredient no longer needed | Remove its shared grocery row |
| Newly needed ingredient or a different unit | Create an unchecked row |
| Contributor changes from one guest to another | Keep shopping unchanged; reset that dish's readiness |

Deliberately unassigned groceries remain unassigned. Existing shared groceries require a confirmation before a claim or release changes them. Readiness changes leave shopping untouched. A fully contributed menu correctly has no shared groceries.

Room transactions serialize contribution and shopping changes. Replacing increased rows prevents an older purchase submission from marking a newly enlarged quantity as purchased.

Server-rendered pages and API handlers share one process-wide Prisma client, including production builds. This keeps the configured connection-pool limit effective across separately bundled routes. Revision failures retain a real error response and log only a recognized error code, without driver messages or credentials.

### Menu comparison and finalization

Before finalization, a compact comparison shows actual dish and portion differences, estimated total cost, estimated cost per planned guest, and separate Like, Neutral, and Veto counts. Common dishes can be inspected once, and each comparison links to the complete menu and its voting controls.

After finalization, the selected menu is prominent and other options are collapsed for reference. Dish portions, dietary notes, veto explanations, Potluck contributions, shopping access, and the existing undo workflow remain available as appropriate to the room state and participant. Layout changes retain the original colors, typography, and card treatment.

## Verification

- All 313 unit tests passed across 30 files.
- All 32 database tests passed across five files, including grocery reconciliation, stale-row rejection, authorization, concurrent claims, and transaction rollback.
- Lint and the production build, including TypeScript, passed.
- Secret scanning and evidence-redaction checks passed. The production dependency audit reported zero vulnerabilities.
- All 27 local browser tests passed: 21 in the full Chromium suite, plus the three collaboration regression tests in both Firefox and WebKit. The remote-deployment health check was skipped in local mode.

The Chromium suite covers all seven meal formats, voting, finalization and reopening, Potluck contributions and shopping, guest access, interaction feedback, accessibility, and security boundaries. The cross-browser collaboration tests cover retained room identities, shared updates with draft protection, and the anonymous host account-upgrade entry point.

The browser review checks menu comparison and finalization at 375px, 768px, and 1440px, with Axe accessibility and touch-target checks. Representative captures are included: [selected menu on desktop](evidence/ui/selected-menu-desktop.png) and [menu comparison on mobile](evidence/ui/menu-comparison-mobile.png).

Earlier acceptance results remain historical evidence; they do not establish acceptance of these changes. This document claims no production deployment, real GitHub callback acceptance, or completed managed-environment validation. The project owner handles deployment.

The earlier format contract and evidence remain in [`EVENT_FORMAT_EXPANSION.md`](EVENT_FORMAT_EXPANSION.md). Production and staging requirements remain in [`PRODUCTION_READINESS_PLAN.md`](PRODUCTION_READINESS_PLAN.md) and [`STAGING_OPERATIONS_RUNBOOK.md`](STAGING_OPERATIONS_RUNBOOK.md).
