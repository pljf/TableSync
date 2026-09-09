import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

const reviewViewports = [
  { name: "mobile-375x812", width: 375, height: 812 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "desktop-1440x900", width: 1440, height: 900 }
] as const;

export async function expectNoAccessibilityViolations(page: Page, label: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(
    result.violations,
    `${label} accessibility violations:\n${result.violations
      .map((violation) => `${violation.id} (${violation.impact}): ${violation.help}`)
      .join("\n")}`
  ).toEqual([]);
}

export async function captureResponsiveEvidence(page: Page, stateName: string) {
  for (const viewport of reviewViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(page.locator("body")).toBeVisible();
    // Capture the page from its origin; sticky navigation otherwise appears in
    // the middle of a full-page image after an interaction scrolls the viewport.
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(
      overflow.scrollWidth,
      `${stateName} overflows horizontally at ${viewport.name}`
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);

    const roomFieldHeights = await page.evaluate(() => {
      const title = document.querySelector<HTMLInputElement>('input[name="title"]');
      const date = document.querySelector<HTMLInputElement>('input[type="datetime-local"][name="dateTime"]');
      if (!title || !date) return null;
      return { title: title.getBoundingClientRect().height, date: date.getBoundingClientRect().height };
    });
    if (roomFieldHeights && roomFieldHeights.title > 0 && roomFieldHeights.date > 0) {
      expect(roomFieldHeights.date, `${stateName} date input stretches beside the format description at ${viewport.name}`)
        .toBeLessThanOrEqual(roomFieldHeights.title + 8);
    }

    const undersizedTargets = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLElement>(".button, .icon-button, .icon-text-button, .tab-nav a, .nav-links a")
      )
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        })
        .map((element) => ({
          height: Math.round(element.getBoundingClientRect().height),
          label: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
          width: Math.round(element.getBoundingClientRect().width)
        }))
    );
    expect(undersizedTargets, `${stateName} has undersized controls at ${viewport.name}`).toEqual([]);

    const directory = resolve("docs", "evidence", "screenshots", viewport.name);
    await mkdir(directory, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(directory, `${stateName}.png`)
    });
  }
}
