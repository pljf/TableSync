# Workflow clarity — September 8, 2026

The user chose to retain the existing green-and-cream visual style and implement the first three proposed UI priorities: clear progress, one obvious next action, and useful readiness guidance. The separate style concept was not applied to the app.

## Changes

- Overview, Plans, and Shopping now show Preferences → Menu & voting → Shopping progress derived from the room status, independently of the tab being viewed. Response counts remain accurate when attendance exceeds the expected count, and do not imply every expected guest must respond before planning.
- The overview has one primary next action. An empty host room leads to Add my preferences with Invite guests secondary. Hosts with responses can open menu planning; participants can edit their preferences. Failed generation leads to report review, voting leads to menu choice or voting according to role, and finalized rooms lead to shopping or Potluck contributions.
- Plans explains the current prerequisite and available action. Failed generation retains report and budget recovery. Finalized menus have a forward shopping action; Potluck retains its contribution workflow.
- Empty Shopping explains that host finalization creates the grocery list automatically and links to the appropriate next step for the current room and actor. All-contributed Potluck remains a valid zero-grocery result. Archived guidance does not link to unavailable contribution controls.
- Existing tab loading feedback, authorization, confirmations, and persisted data behavior remain in place. Menu comparison redesign and broader mobile layout changes remain outside this increment.

## Verification

- All 248 unit tests across 20 files passed, including 20 new progress and next-action cases.
- Scoped lint and the production build, including TypeScript, passed.
- Four Chromium production workflows passed: Dinner with undo/reopen, Potluck with independent guest contributions and recovery, persisted no-solution/budget recovery, and the complete anonymous-host workflow.
- Six slow-navigation cases passed across Chromium, Firefox, and WebKit, covering pointer/keyboard input, both motion preferences, and truthful progress when opening Plans or Shopping before preferences are saved.
- Updated assertions exercise the overview action, Shopping prerequisites during voting, progress tied to actual state, and the finalized forward action.
- The existing browser workflow captured responsive/accessibility evidence. An independent visual review approved the current empty-room and finalized-plan screenshots at mobile and desktop widths.

The checks use attributed temporary test rooms and preserve the user's existing room and guest session. This remains a local preview update, not a remote deployment.
