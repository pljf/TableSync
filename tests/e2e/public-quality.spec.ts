import { expect, test, type Route } from "@playwright/test";
import { captureResponsiveEvidence, expectNoAccessibilityViolations } from "./quality-helpers";

test.describe("public quality surfaces", () => {
  test("home and guest entry are accessible with keyboard-visible navigation", async ({ page }, testInfo) => {
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        const location = message.location();
        const source = location.url
          ? ` at ${location.url}:${location.lineNumber}:${location.columnNumber}`
          : "";
        browserErrors.push(`console: ${message.text()}${source} while viewing ${page.url()}`);
      }
    });
    page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));

    // A pending photograph must not prevent us from checking usable page content.
    // Guard against the full-load navigation waits that timed out in CI.
    const isImage = (url: URL) => url.pathname === "/_next/image";
    let releaseImages!: () => void;
    const imagesReleased = new Promise<void>((resolve) => { releaseImages = resolve; });
    const holdImage = async (route: Route) => {
      await imagesReleased;
      await route.continue();
    };
    await page.route(isImage, holdImage);
    const imageRequested = page.waitForRequest((request) => isImage(new URL(request.url())));
    try {
      await Promise.all([
        page.goto("/", { waitUntil: "domcontentloaded" }),
        imageRequested
      ]);
      // Audit the destination content and streamed metadata once they are ready.
      await expect(page).toHaveTitle("TableSync");
      await expect(page.getByRole("heading", { level: 1, name: /Good food\.\s*Better\s*company\./ })).toBeVisible();
      expect(await page.evaluate(() => document.readyState)).toBe("interactive");
    } finally {
      releaseImages();
      await page.unrouteAll({ behavior: "wait" });
    }
    await expectNoAccessibilityViolations(page, "home");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    if (testInfo.project.name === "webkit") {
      // Headless WebKit follows Safari's system keyboard-navigation preference,
      // which does not Tab-focus links by default. Explicit focus still verifies
      // that the skip target is operable and has a visible focus treatment.
      await skipLink.focus();
    } else {
      await page.keyboard.press("Tab");
    }
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
    if (testInfo.project.name === "chromium") {
      await captureResponsiveEvidence(page, "home");
    }

    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle("TableSync");
    await expect(page.getByRole("heading", { name: "Come on in.", exact: true })).toBeVisible();
    await expectNoAccessibilityViolations(page, "authentication");
    if (testInfo.project.name === "chromium") await captureResponsiveEvidence(page, "authentication");

    await page.goto("/auth?error=access_denied&callbackURL=https%3A%2F%2Fattacker.invalid", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle("TableSync");
    await expect(page.getByRole("heading", { name: "Come on in.", exact: true })).toBeVisible();
    await expect(page.locator(".error-feedback[role='alert']")).toHaveText(
      "Sign-in was not completed. No session was created; please try again."
    );
    await expect(page).toHaveURL(/\/auth\?error=access_denied/);
    await expect(page.getByText(/attacker\.invalid/i)).toHaveCount(0);
    await expectNoAccessibilityViolations(page, "authentication-error-recovery");

    await page.goto("/demo", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle("TableSync");
    await expect(page.getByRole("heading", { name: "Come on in.", exact: true })).toBeVisible();
    await expectNoAccessibilityViolations(page, "guest-entry");

    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotion = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    expect(reducedMotion).toBe(true);
    expect(browserErrors, "Unexpected browser errors occurred on public quality pages").toEqual([]);
  });
});
