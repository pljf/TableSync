# Simpler gathering creation

The creation form keeps gathering essentials and the host’s name, diet, allergies, and spice tolerance visible. Native expandable sections contain optional location/sharing details and personal preferences. Opening or closing these sections does not remount inputs, discard drafts, or change the single server-action submission. Existing validation, guest identity, and host authorization remain in place.

Every required control is outside a collapsed section. Optional fields remain named controls inside the form without JavaScript; native summaries work with the keyboard. With JavaScript, an invalid optional control opens its section before browser validation focuses the field. A closed section’s first invalid control receives focus and native validation feedback after it renders, including in WebKit; an earlier invalid required control keeps priority. Guest invitation and preference-editing forms retain their complete layout.

Occasion buttons remain disabled until their client handlers are ready, so an early click cannot silently keep the default selection. The homepage’s selected occasion links to /rooms/new?eventType=BRUNCH (or the chosen catalog event type). An unauthenticated visitor goes through /auth?create=1&eventType=BRUNCH; guest and GitHub sign-in both return to that creation form. GitHub retry URLs retain the intent. Duplicate or unknown event types are ignored, and callbacks are built from this constrained intent rather than user-supplied URLs. Account-upgrade callbacks retain their existing behavior.

Creation is outside a streamed loading fallback: its complete server HTML remains readable when JavaScript is disabled. The existing loading skeleton is shared by the auth, dashboard, invitation, sharing, preferences, and room workflow segments. Preview retains its own explicit Suspense fallback.

Existing browser fixtures explicitly open the optional sections before filling them. The dedicated creation browser suite covers occasion sign-in, draft preservation, invalid-field disclosure, and native no-JavaScript operation.

No-JavaScript coverage verifies readable required fields, native keyboard disclosures, and retained form values. Submission still uses the existing client action wrapper and is not presented as a supported or verified no-JavaScript submission path. The default JavaScript flow retains existing server authorization, validation, pending feedback, and recoverable draft handling.
