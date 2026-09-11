# TableSync UI redesign — September 7, 2026

> Historical record. Status statements and verification results reflect the work recorded here. See the [archive index](../README.md) for context and current guides.

The visual redesign is implemented across the existing Dinner and Hotpot product. This record covers the design work; the earlier bug review remains in [REVIEW_2026_09_07.md](REVIEW_2026_09_07.md), and the concurrent guest-account implementation is documented separately in [GUEST_ACCESS_REVIEW.md](GUEST_ACCESS_REVIEW.md).

## What changed

| Priority | Completed work | User-visible result |
| --- | --- | --- |
| P1 — clear navigation | Shared header, current-page navigation, prominent room next step, and responsive room workspace. | Hosts can see where they are and what to do next. Guest entry and the host's own preference path are preserved. |
| P2 — visual identity | Warm ivory surfaces, deep olive actions, terracotta accents, serif display headings, and an original dinner-table SVG illustration. | Home and sign-in have a consistent, more distinctive visual style. The illustration scales without external downloads. |
| P2 — planning and shopping | Numbered menu options, compact score/vote summaries, divided dish lists, clearer category rows, and a purchased-items progress bar derived from saved data. | Menus are easier to compare, and shopping status is easier to scan. Existing permissions, confirmations, drafts, and filters remain functional. |
| P2 — dashboard and forms | Redesigned empty dashboard, room totals, room cards, guest initials, form spacing, and invite/activity panels. | Empty and populated screens both have useful hierarchy instead of repeating the same plain cards. |
| P3 — responsive polish | Compact mobile summaries, wrapping controls, 44px minimum action targets, visible keyboard focus, and reduced-motion styling. | The design works at phone, tablet, and desktop widths without horizontal overflow in the reviewed states. |

The styles are organized into shared foundations, shell/dashboard styling, and welcome/authentication styling. No dependency, external font, or image service was added.

## Independent visual review

Three subagents helped with the welcome screens, dashboard/shell, and independent visual review. The visual reviewer checked screenshots of home, authentication, empty/populated dashboard, room overview, Dinner/Hotpot voting, and shopping. Two responsive defects were found and corrected: tablet next-step buttons crowded the text, and a short Hotpot status badge broke across lines on mobile.

## Verification

The visual build passed lint, all 110 unit tests at that point, production compilation/TypeScript, and schema status (11 migrations applied). The coordinated authentication repairs subsequently passed the expanded 123-test unit suite and a new production build; their additional browser evidence is described below.

| Check | Confirmed result |
| --- | --- |
| Chromium fresh workflows | Dinner, Hotpot, and no-solution/budget-edit recovery passed against the build containing both responsive corrections. Draft/filter regressions remain asserted. |
| Chromium public/protocol checks | Home/authentication, retired-demo/preferences recovery, and headers/origin checks passed; remote-only deployment health was intentionally skipped. |
| Firefox and WebKit | Public home/authentication accessibility, keyboard navigation, error recovery, and reduced-motion checks passed on both engines. Full core workflows were not rerun on these engines during this visual change. |
| Independent visual review | Final tablet banner and mobile Hotpot badge corrections approved. |
| Responsive evidence | 48 screenshots across 16 states at three viewport sizes, plus two mobile guest-dashboard/session-confirmation captures (50 total). Reviewed states passed overflow and minimum action-size assertions, with zero Axe violations. The guest confirmation panel also fits entirely within 375×812. |
| Scans | Secret scan and evidence redaction passed; whitespace validation passed. |

Guest privacy/session confirmation passed after correcting two exact-label test selectors to target the dropdowns' accessible combobox names. The full anonymous-host workflow then exposed a real sign-out cookie issue after the host had also joined as a diner. The coordinated guest-access repair preserves both host and participant cookie expirations. The anonymous-sign-in origin check also exposed a missing application boundary; authentication POST requests now require a configured trusted origin. The final build passed all three guest scenarios across two focused batches: privacy, complete anonymous preferences → voting → finalization → shopping → logout, and rejected-origin/failed-sign-in retry. The retry assertion was scoped to the app's error instead of Next's separate route announcer. Further details are in [GUEST_ACCESS_REVIEW.md](GUEST_ACCESS_REVIEW.md).

The primary screenshots cover 16 states at 375×812, 768×1024, and 1440×900; the extra guest captures use 375×812. Accessibility, horizontal-overflow, and action-size assertions run with the existing workflow tests. Synthetic browser-test room data appears in these screenshots. A separate mobile guest session was created for visual inspection and ended afterward; no room was added in that check.

Two earlier attempts were interrupted by shared build/database activity: rebuilding `.next` while a server was running caused a missing chunk, and the experimental local Prisma proxy later returned protocol/connection errors. Those failed attempts are not acceptance evidence. The tasks were coordinated, the existing database service was restarted without resetting data, and the final build was completed before serial testing resumed.

## What is still missing

The redesign does not close the product gaps in the prioritized review:

- **P1:** External production acceptance and complete dietary certification/cross-contact metadata.
- **P2:** Deliberate participant-identity switching and recovery, individual spending limits, invite rotation/revocation, guest removal, and room archiving.
- **P3:** Cross-device live updates, richer room-edit history, and the explicitly deferred event types/integrations.

Guest entry is now available from the separately implemented access work. That makes local exploration possible without GitHub setup; it does not replace the outstanding remote acceptance work. This UI change has not been deployed or committed.
