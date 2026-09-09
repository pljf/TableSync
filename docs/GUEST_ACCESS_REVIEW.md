# Guest access and usability review

> This records the initial guest-access implementation. The later seven-format expansion and final integrated verification are recorded in [the interaction and full-stack review](INTERACTION_FULL_STACK_REVIEW_2026_09_08.md).

This change replaces the shared demo entry with **Continue as guest**, so someone can create a room and inspect the full Dinner/Hotpot workflow without configuring GitHub. Earlier review documents remain historical records; their sign-in limitations and test totals do not describe this change.

## Access and setup changes

- Better Auth creates a unique anonymous host account and a normal database-backed session for each new guest browser session. Room ownership and participant permissions still apply.
- GitHub sign-in is optional when its provider credentials are configured. Guest access does not depend on those credentials.
- Guest access lasts up to seven days in the same browser. Ending the session or clearing its cookies removes access to its rooms. There is no cross-device recovery for an anonymous account; the end-session control explains this and requires confirmation.
- The new `20260908000000_add_anonymous_hosts` migration adds `User.isAnonymous`, bringing the migration history to eleven entries. Existing databases must apply it before using guest access.
- Seeding now upserts only ingredients and dishes. `/demo` redirects to `/auth`, and the private room loader no longer accepts a public-demo authorization bypass.
- `scripts/remove-legacy-demo.ts` offers a dry run for an existing legacy demo record. Applying cleanup requires `--apply` and verifies the fixed room ID, host identity, title, and invite token before removing only that room and its dependent records. The local cleanup was executed after the dry run verified the exact legacy room and its six seeded guests, three plans, twelve shopping rows, and five activity events. The host account and dish catalog were retained.

For persistent local sessions, configure a stable `BETTER_AUTH_SECRET` with at least 32 random characters. The development fallback secret is in memory and changes when the server restarts. Managed environments still require a valid configured secret, HTTPS origin, and the existing database safeguards.

## Reviewed usability gaps addressed

| Gap | Result |
| --- | --- |
| A new host could create an empty room but could not see how to participate and reach menu generation. | The room overview and empty Plans page offer **Add my preferences**. The route through the product is now explicit: add preferences, open Plans, generate menus, vote, finalize a plan, then open Shopping. |
| Opening `/preferences` without an active meal response led to an unexplained missing page. | The page explains that no meal response is active, directs invited participants to their host's invitation, and tells hosts to open their room and choose **Add my preferences**. |
| Shopping's cost per person used only submitted responses, overstating the estimate when the menu served more planned guests. | The estimate divides the shopping total by the larger of planned guests and submitted responses, with a minimum of one, and shows the guest count beneath the value. |

## Remaining limits

A browser still stores only one active meal-response session. Submitting a second response, including one for another room, replaces the browser's access to the previous participant. The original response remains in the room, but that browser cannot edit or vote as the previous participant. The join form explains the switch before submission and links an existing same-room participant to their saved preferences. Separate browser profiles or devices are still needed to try multiple participants independently. The host-account session is separate and is not replaced by joining a room.

This change does not complete the external production acceptance work recorded in the staging runbook. Real GitHub callback evidence, managed database recovery, an attributable HTTPS deployment, and the remote acceptance gate still need their own verification.

## Validation

Current automated checks: 123 unit tests and 14 PostgreSQL integration tests passed; lint, TypeScript, and the production build passed. All eleven local migrations are applied. A stable local session secret was configured without exposing its value.

All three Chromium guest scenarios passed against the final production build on the normal local server, without a test authentication bypass. The first two passed together; the third passed in a focused rerun after its error-message assertion was scoped to the page content to exclude Next.js's route announcer. Coverage includes isolated guest accounts and private-room access, cookie security and tampering, session reuse and logout, room creation through preferences, voting, finalization and shopping, untrusted-origin rejection, and retry after a failed guest sign-in. Browser runs were serialized with the concurrent UI review to avoid overlapping local database work.

The concurrent UI review also verified the guest dashboard and expanded end-session confirmation at 375 × 812 pixels: neither view overflowed horizontally, both had zero Axe accessibility violations, and the confirmation stayed inside the viewport. Screenshots are saved under `docs/evidence/screenshots/mobile-375x812/guest-dashboard.png` and `guest-end-confirmation.png`. A fresh guest account was opened in the app's browser, and its dashboard remained accessible after reload.

The browser regression caught a logout defect only when a guest host also had a meal-response cookie: writing the second expiry through Next's mutable cookie store replaced the host-cookie expiry returned by Better Auth. The route now appends the meal-cookie expiry directly to the same response after database revocation. Unit coverage checks that all host expirations and the meal-cookie expiration survive together, and the complete guest workflow confirms successful logout in the browser.

The cross-origin browser case also found that the anonymous authentication endpoint accepted a no-cookie request with an unrelated Origin. All authentication POST requests now require an Origin that exactly matches the configured trusted origins before reaching Better Auth. Missing, null, malformed/lookalike, or untrusted origins return 403; configured additional trusted origins remain supported. GET callbacks are unchanged. Unit and browser regression checks pass.
