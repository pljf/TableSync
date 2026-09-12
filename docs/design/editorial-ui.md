# Editorial UI and real photography

This revision applies the approved TableSync design to the live product: a tomato-red cover, Bricolage Grotesque and Manrope typography, photographic gathering cards, restrained entrance motion, and more distinct menu and shopping surfaces.

## Product integration

- Homepage planning actions enter the existing guest sign-in or authenticated dashboard/room-creation flow.
- Dashboard, gathering overview, creation, menu review and shopping retain their existing database reads, server actions, permission checks, room-revision synchronization and lifecycle notices.
- The public `/preview` route is an explicitly labeled interactive example with local sample state. It is not used as a replacement for saved gatherings.
- Actual menu ingredients, costs, allergy handling, voting, veto, finalization and contributions are unchanged.

## Motion and accessibility

Content is visible without JavaScript. IntersectionObserver and Web Animations progressively reveal sections; homepage planning steps can change the example on desktop while mobile uses direct controls. Reduced-motion preferences disable animation, and active example controls prevent automatic step changes. Mobile workspace navigation remains available. Existing keyboard press feedback and live action announcements are retained.

## Photography

Fifteen photographs and two OFL font families are served locally. Every photographer, original source page and reuse license is listed at `/photo-credits`, linked from the footer. The canonical source manifest is `src/lib/photo-library.ts`. Images are resized, converted to WebP and proportionally cropped by CSS; no generative edits were used. CC BY-SA terms remain attached to each applicable photograph.

Photos offer serving inspiration: pictured ingredients can differ from a selected recipe. Real menus only use a photograph when a catalog ID has an explicit match in `src/lib/dish-photography.ts`. Other dishes use category icons, rather than unrelated photos or the previous generated illustrations.

## Compatibility and review

Route props follow the installed Next.js Promise-only `params` and `searchParams` contracts; existing awaits preserve runtime behavior. Direct test invocations and dashboard heading assertions follow those contracts and the new visible title.

The original preview was reviewed at desktop, tablet and phone widths, including reduced motion and core example interactions. Production adoption receives code review, unit tests, lint and a production build; the repository CI runs its database and browser suites against this branch.
