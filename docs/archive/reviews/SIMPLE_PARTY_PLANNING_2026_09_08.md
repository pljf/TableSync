# Simple party planning

> Historical record. Status statements and verification results reflect the work recorded here. See the [archive index](../README.md) for context and current guides.

Date: 2026-09-08

## Goal and scope

Complete the five usability improvements from `docs/archive/reviews/USABILITY_REVIEW_2026_09_08.md`, keeping everyday party planning simple. Preserve the existing green-and-cream design, immediate guest entry, and the seven meal formats. This follow-up builds on the collaboration work in PR #4; it does not duplicate that pull request or deploy the application.

## What changed

| Improvement | Result | Delivery |
| --- | --- | --- |
| Preserve shopping work | Potluck contributor transfers retain shopping. Claims/releases reconcile affected ingredients, retaining unaffected assignments and purchase checks. Enlarged quantities need another purchase check. | Implemented in PR #4; reviewed and regression checked in this follow-up. |
| Compare menus quickly | Repeated menu titles now use distinctive dishes or portions. Show how many joined guests have voted and optionally who is still to respond. Keep cost and dish differences prominent; a collapsed explanation describes suggestions without an unexplained numeric score. | Existing comparison from PR #4, completed here. |
| Keep guest access | One saved meal response per room in the browser, plus optional **Save my rooms** for guest hosts through configured GitHub sign-in. Login-free entry stays available. | Implemented in PR #4; identity, logout, replay, and transfer behavior reviewed here. |
| Follow group changes | Check visible rooms periodically, protect drafts, and show **Updates are waiting** when edits defer a refresh. A canceled confirmation resumes updates. Failed content refreshes retry until rendered data acknowledges the change. Clean vote notes adopt another tab's saved reason; real drafts survive. | Existing polling from PR #4, recovery and draft fixes here. |
| Move from planning to preparation | The chosen menu stays prominent and alternatives collapsed. **Prepare this menu** jumps to expandable dishes with finalized portions, scaled ingredients, estimated time, adjustments, and Potluck contribution context. **Open shopping** remains beside it. | Selected-menu focus from PR #4, preparation view here. |

The preparation view uses existing catalog data and labels amounts as scaled shopping estimates, since purchase units such as bottles are not precise cooking measures. It does not invent cooking instructions or claim that per-dish estimates add up to a whole-meal schedule. Curated cooking steps remain future content work, as proposed in the original review.

The Safari CI failures in the base PR also prompted two repairs: saved preference fields wait until their form is ready before accepting input, and room polling pauses explicitly while a document is leaving, then resumes on return. Browser error assertions remain enabled.

## Acceptance

- All seven meal formats expose preparation after finalization, with working keyboard expansion and quantities derived from finalized servings.
- Similar menu choices remain distinguishable, and voting participation uses joined guests rather than planned portions.
- Guest access remains isolated and survives moving between joined rooms; account-save entry preserves the current guest session.
- Unrelated grocery progress survives contribution changes, and stale purchase submissions cannot check newly increased quantities.
- A second browser's change appears automatically when no draft is at risk. Drafts survive, canceled edits release the pause, and failed refreshes retry without a rapid request loop.
- Phone, tablet, desktop, accessibility, build, unit, database, and browser gates are recorded below after execution.

## Validation

Local acceptance recorded before pull-request submission:

- **353 unit tests passed** across 35 files, including portion scaling, comparison identity, vote drafts, form readiness, revision acknowledgement/retry, and navigation lifecycle.
- **32 database tests passed** across five files, including shopping reconciliation, stale-row rejection, authorization, and transaction rollback.
- **22 Chromium browser tests passed** in the full suite (6.4 minutes). The HTTPS deployment health test was skipped in local mode. Every meal format completed preparation and shopping; the collaboration tests also verified draft protection, canceled confirmations, room switching, account-save entry, and navigation with an update request in flight.
- Production build and TypeScript passed. Full lint passed after a test-fixture style correction.
- Secret scanning passed for current source and reachable history; evidence-redaction checks passed.
- Responsive captures and accessibility gates covered 375px, 768px, and 1440px. Independent review found no blocking source defect; the review's clarification about shopping versus cooking quantities was incorporated.

Representative evidence: [preparation on a phone](../../evidence/ui/simple-menu-preparation-mobile.png) and [menu comparison on desktop](../../evidence/ui/simple-menu-comparison-desktop.png). Final additional browser and GitHub Actions outcomes are recorded in the pull request; earlier PR #4 results are historical evidence, not a claim that its failed Safari run passed.

### Safari navigation follow-up

The initial PR #5 head reproduced the native Safari diagnostic despite per-component pagehide cleanup. A temporary diagnostic run showed a newly mounted room trying to fetch after navigation had begun, before an HTTP request could be created. WebKit can [reclassify that synchronous cancellation as an access-control error](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/loader/cache/CachedResourceLoader.cpp#L1337-L1347), and [Playwright reports the native JavaScript diagnostic as a page error](https://github.com/microsoft/playwright/blob/v1.62.1/packages/playwright-core/src/server/webkit/wkPage.ts#L499-L523).

The follow-up keeps departure state for the entire document, established by the persistent navigation before room effects mount. A non-cancelling beforeunload listener stops new work early in WebKit; pagehide retains the state and pageshow resumes it in every browser. Late room mounts inherit the departure state, and live starts are scheduled for the next frame. The early hook is scoped to WebKit, including iOS browser variants, to keep the workaround out of other engines. No browser-error filter or cross-origin policy relaxation was introduced. Lifecycle regressions cover late mounts, history return, and browser-specific listener registration. Final unit, browser, and CI outcomes are recorded in PR #5.

## Release boundary

Real GitHub callback acceptance requires the deployed OAuth configuration. Guests can use the local application without it. Linking saves hosted rooms; participant responses remain browser-specific. Deployment and managed PostgreSQL validation remain with the project owner.

The new branch is `codex/simple-party-planning`, based on `codex/meal-planning-reliability` (PR #4). Merge this follow-up into that branch before merging PR #4 into staging and PR #3 into main. No existing pull request is merged by this task.
