import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function settleEvidenceScroll(page: Page) {
  // Native Space scrolling can outlive the key event, even with reduced motion.
  // Capture only after the viewport remains at the top across consecutive frames.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const started = performance.now();
    let stableFrames = 0;
    function checkScroll() {
      if (performance.now() - started > 2_000) {
        reject(new Error("Native scrolling did not settle before the evidence capture."));
        return;
      }
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        stableFrames = 0;
      } else {
        stableFrames += 1;
      }
      if (stableFrames >= 10) resolve();
      else requestAnimationFrame(checkScroll);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    requestAnimationFrame(checkScroll);
  }));
  await expect(page.locator(".skip-link")).not.toBeFocused();
  expect(await page.locator(".skip-link").evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThan(0);
}

async function focusAppearance(control: Locator) {
  return control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      boxShadow: style.boxShadow,
      transform: style.transform
    };
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`guest action gives keyboard and pending feedback with motion set to ${reducedMotion}`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion });
    let releaseRequest!: () => void;
    let attempts = 0;
    const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve; });
    await page.route("**/api/auth/sign-in/anonymous", async (route) => {
      attempts += 1;
      await requestGate;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Unavailable" }) });
    });

    try {
      await page.goto("/auth");
      const main = page.getByRole("main");
      const idleButton = main.getByRole("button", { name: "Continue as guest", exact: true });

      // Space retains its native scrolling behavior on links instead of
      // receiving the button-only keyboard press treatment.
      const backLink = main.getByRole("link", { name: "Back to TableSync", exact: true });
      await backLink.focus();
      await page.keyboard.down("Space");
      await expect(backLink).not.toHaveAttribute("data-keyboard-pressed", "true");
      await page.keyboard.up("Space");
      await expect(page).toHaveURL(/\/auth$/);

      // Moving focus before releasing Space cancels a button activation and
      // must clear the pressed appearance even before the key is released.
      await idleButton.focus();
      await expect(idleButton).toBeFocused();
      await expect.poll(() => idleButton.evaluate((element) =>
        element.getAnimations().some((animation) => animation.playState === "running")
      )).toBe(false);
      const focused = await focusAppearance(idleButton);
      expect(focused.outlineStyle).not.toBe("none");
      expect(focused.outlineWidth).toBeGreaterThanOrEqual(2);

      await page.keyboard.down("Space");
      await expect(idleButton).toHaveAttribute("data-keyboard-pressed", "true");
      await page.keyboard.press("Shift+Tab");
      await expect(idleButton).not.toBeFocused();
      await expect(idleButton).not.toHaveAttribute("data-keyboard-pressed", "true");
      await expect(idleButton).toHaveAttribute("data-keyboard-activation", "true");
      await page.keyboard.up("Space");
      await expect(idleButton).toHaveAttribute("aria-busy", "false");
      await expect(page.locator(".interaction-ripple")).toHaveCount(0);
      expect(attempts).toBe(0);

      await idleButton.focus();
      await expect(idleButton).toBeFocused();
      // Removing the pressed attribute starts a CSS transition. Require the
      // original idle appearance before taking another press measurement.
      // WebKit's stale native :active must not override the tracked state.
      await expect.poll(async () => {
        const appearance = await focusAppearance(idleButton);
        return { boxShadow: appearance.boxShadow, transform: appearance.transform };
      }).toEqual({ boxShadow: focused.boxShadow, transform: focused.transform });

      // Hold the key down long enough to inspect the actual pressed appearance.
      // Releasing Space activates the same public guest action as a pointer tap.
      await page.keyboard.down("Space");
      await expect(idleButton).toHaveAttribute("data-keyboard-pressed", "true");
      await expect.poll(async () => (await focusAppearance(idleButton)).boxShadow).not.toBe(focused.boxShadow);
      if (reducedMotion === "no-preference") {
        await expect.poll(async () => (await focusAppearance(idleButton)).transform).not.toBe(focused.transform);
      } else {
        expect((await focusAppearance(idleButton)).transform).toBe("none");
      }
      await page.keyboard.up("Space");
      await expect(main.locator('[data-keyboard-pressed="true"]')).toHaveCount(0);

      if (reducedMotion === "reduce") {
        await expect(page.locator(".interaction-ripple")).toHaveCount(0);
      } else {
        await expect(page.locator(".interaction-ripple")).toHaveCount(1);
      }
      const pendingButton = main.locator('button[aria-busy="true"]');
      await expect(pendingButton).toHaveCount(1);
      await expect(pendingButton).toBeDisabled();
      await expect(pendingButton).toHaveAttribute("data-state", "pending");
      await expect(main.locator('.action-feedback[data-state="pending"][role="status"]')).toBeVisible();
      await expect(pendingButton.locator(".button-spinner")).toBeVisible();
      await expect(pendingButton).toHaveAccessibleName(/opening.*workspace/i);

      const motion = await pendingButton.evaluate((element) => {
        const style = getComputedStyle(element);
        const spinner = element.querySelector(".button-spinner");
        const spinnerStyle = spinner ? getComputedStyle(spinner) : null;
        const seconds = (value: string) => value.split(",").map((part) => {
          const trimmed = part.trim();
          return Number.parseFloat(trimmed) / (trimmed.endsWith("ms") ? 1000 : 1);
        });
        return {
          animationDurations: seconds(spinnerStyle?.animationDuration ?? "0s"),
          animationName: spinnerStyle?.animationName,
          scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
          transitionDurations: seconds(style.transitionDuration)
        };
      });
      if (reducedMotion === "reduce") {
        expect(Math.max(...motion.animationDurations)).toBeLessThanOrEqual(0.001);
        expect(Math.max(...motion.transitionDurations)).toBeLessThanOrEqual(0.001);
        expect(motion.scrollBehavior).toBe("auto");
      } else {
        expect(motion.animationName).not.toBe("none");
        expect(Math.max(...motion.animationDurations)).toBeGreaterThan(0);
        await expect(page.locator(".interaction-ripple")).toHaveCount(0, { timeout: 2_000 });
      }

      if (test.info().project.name === "chromium") {
        const directory = resolve("docs/evidence/screenshots/mobile-375x812");
        await mkdir(directory, { recursive: true });
        await settleEvidenceScroll(page);
        await page.screenshot({ animations: "disabled", fullPage: true, path: resolve(directory, `guest-pending-${reducedMotion}.png`) });
      }

      // Repeated activation cannot submit again while the first request is held.
      await pendingButton.evaluate((element) => (element as HTMLButtonElement).click());
      releaseRequest();
      await expect(main.locator('.action-feedback[data-state="error"][role="alert"]')).toHaveText(
        "Guest access could not start. Please try again."
      );
      await expect(idleButton).toBeEnabled();
      await expect(idleButton).toHaveAttribute("aria-busy", "false");
      expect(attempts).toBe(1);
      await expect(page).toHaveURL(/\/auth$/);
      if (test.info().project.name === "chromium") {
        await settleEvidenceScroll(page);
        await page.screenshot({ animations: "disabled", fullPage: true, path: resolve("docs/evidence/screenshots/mobile-375x812", `guest-error-${reducedMotion}.png`) });
      }
      if (reducedMotion === "reduce") await expect(page.locator(".interaction-ripple")).toHaveCount(0);

      // Pointer input restores native pressed feedback after keyboard use.
      // Release outside the button so this check does not start another action.
      await idleButton.hover();
      await expect.poll(() => idleButton.evaluate((element) =>
        element.getAnimations().some((animation) => animation.playState === "running")
      )).toBe(false);
      const pointerIdle = await focusAppearance(idleButton);
      await page.mouse.down();
      await expect(idleButton).not.toHaveAttribute("data-keyboard-activation", "true");
      await expect(idleButton).not.toHaveAttribute("data-keyboard-pressed", "true");
      await expect.poll(async () => (await focusAppearance(idleButton)).boxShadow).not.toBe(pointerIdle.boxShadow);
      if (reducedMotion === "reduce") {
        expect((await focusAppearance(idleButton)).transform).toBe("none");
      } else {
        await expect.poll(async () => (await focusAppearance(idleButton)).transform).not.toBe(pointerIdle.transform);
      }
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await expect(idleButton).toHaveAttribute("aria-busy", "false");
      expect(attempts).toBe(1);
    } finally {
      releaseRequest();
      await page.keyboard.up("Space");
      await page.mouse.up();
      await page.unroute("**/api/auth/sign-in/anonymous");
    }
  });
}
