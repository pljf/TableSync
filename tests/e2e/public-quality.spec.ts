import { expect, test } from "@playwright/test";
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

    await page.goto("/");
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

    await page.goto("/auth");
    await expectNoAccessibilityViolations(page, "authentication");
    if (testInfo.project.name === "chromium") await captureResponsiveEvidence(page, "authentication");

    await page.goto("/auth?error=access_denied&callbackURL=https%3A%2F%2Fattacker.invalid");
    await expect(page.locator(".error-feedback[role='alert']")).toHaveText(
      "Sign-in was not completed. No session was created; please try again."
    );
    await expect(page).toHaveURL(/\/auth\?error=access_denied/);
    await expect(page.getByText(/attacker\.invalid/i)).toHaveCount(0);
    await expectNoAccessibilityViolations(page, "authentication-error-recovery");

    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Come on in.", exact: true })).toBeVisible();
    await expectNoAccessibilityViolations(page, "guest-entry");

    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotion = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    expect(reducedMotion).toBe(true);
    expect(browserErrors, "Unexpected browser errors occurred on public quality pages").toEqual([]);
  });
});
