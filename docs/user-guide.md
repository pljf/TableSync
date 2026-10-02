# User guide

[Documentation index](README.md) · [Project overview](../README.md)

## Plan a meal

1. Open the app and choose **Continue as guest**. This creates a private account for your browser and opens your dashboard. GitHub is optional.
2. Create a room and choose Dinner, Hotpot, Potluck, BBQ, Picnic, Brunch, or Other for a shared buffet. Set the planned guest count, including yourself, and an optional total budget.
3. Fill in **Your meal preferences** before choosing **Create room**. Your response appears in the guest list with a **Host** label and is included in menu planning.
4. Copy the room's invite link and send it to the other participants. They can submit preferences without a host account. Use **My preferences** to update your own response before voting starts.
5. Open **Plans** and choose **Generate plans**. Compare the dishes, portions, and estimated total and per-person costs. Save a Like, Neutral, or Veto; a Veto requires a reason.
6. Choose **Finalize plan** on your preferred menu. The final menu includes preparation details, ingredient estimates, timing, and adjustment notes. Other options remain available for reference.
7. Open **Shopping** to review groceries, assign items, and mark purchases. If public sharing is enabled, use the room's Share link to share a read-only final menu.

Creators can vote using the response saved during room creation. For an older room without a creator response, choose **Add my preferences** before moving to voting.

The menu planner considers diets, allergies, preferences, the room budget, and spice tolerance. Complete religious-diet certification rules are not implemented. Costs are estimates.

## Shopping budgets and estimates

Automatic shopping assignments respect the saved **Budget comfort** of guests who volunteered to bring groceries. Claimed Potluck dishes count toward the contributor's comfort before shared groceries are assigned. Items that do not fit any volunteer's remaining comfort stay **Unassigned**; review assignments, adjust budget comfort, or revise the menu. Guests without a stated comfort limit can cover remaining costs.

Assignment totals show the estimate against each stated comfort limit. Manual claims, reassignments, or preserved assignments can exceed comfort, and the shopping page shows that excess. Ingredient estimates allocate recipe costs using quantities and indicative unit costs; recipes with unsupported ingredients or units use equal shares. These amounts cover recipe portions, so full packages and local checkout prices may cost more. Budget comfort does not guarantee a retailer checkout cap. See [shopping estimates](shopping-estimates.md) for the allocation rules and limitations.

## Potluck contributions

For Potluck, guests can claim whole dishes and track their readiness. Claiming or releasing a dish recalculates the shared groceries still needed:

- Unchanged or reduced ingredient quantities retain their assignments and purchase checks, including deliberate unassignments.
- Increased quantities retain their assignment but require a new purchase check.
- Ingredients no longer needed are removed.
- Transferring a dish to another contributor leaves groceries unchanged and resets the dish's readiness.

## Guest accounts and saved preferences

Guest host access stays in the same browser for up to seven days. When GitHub sign-in is configured, choose **Save my rooms** to connect the current account to GitHub and return to it across devices. Connecting an account does not extend room expiry.

Without that connection, ending the guest session, clearing cookies, or losing the session removes access to that anonymous account's rooms. The app asks for confirmation before ending a guest session.

A browser keeps a separate meal-response session for each room. Joining another room preserves access to earlier responses, and each room's preferences and voting use that room's participant identity. Use separate browser profiles or devices for different participants in the same room. Host-account sessions are separate from meal-response sessions.

Visible room pages check for shared changes every eight seconds while preserving unsaved drafts. Use the retry controls if a shared update fails.

## Room expiry and deletion

Every room expires **seven days (168 hours) after creation or three days (72 hours) after its scheduled gathering, whichever is later**, including rooms hosted through GitHub. Undated rooms expire seven days after creation. Creation and room pages show this policy and the expiration date. Changing the gathering date updates its expiration; editing other details or connecting an account does not extend it. Session lifetimes are separate from room retention: a saved account can sign in again to access its retained rooms, while anonymous host access still belongs to its current browser session.

Creators can use **Delete room** on the overview to permanently remove a room sooner after confirming. This removes its guest responses, menus, votes, shopping progress, and invite/share links.

Expired rooms become inaccessible immediately. Their records are permanently deleted by the next successful scheduled cleanup job, so physical deletion may happen after the expiry time. The account and shared recipe catalog remain available. Operators can find configuration and timing details in the [room retention guide](deployment/room-retention.md).
