import { expect, test } from "@playwright/test";
import { captureResponsiveEvidence, expectNoAccessibilityViolations } from "./quality-helpers";

test("example navigation stays in the example and remains usable at 320px", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/preview?tab=shopping", { waitUntil: "domcontentloaded" });
  const main = page.getByRole("main");
  const header = page.getByRole("navigation", { name: "Main navigation", exact: true });
  const gatherings = page.getByRole("link", { name: "My gatherings", exact: true });
  await expect(gatherings).toHaveCount(2);
  for (const link of await gatherings.all()) {
    await expect(link).toHaveAttribute("href", "/preview?view=dashboard");
  }
  await expect(header.getByRole("link", { name: "New gathering", exact: true }))
    .toHaveAttribute("href", "/preview?view=new");
  await expect(main.getByRole("link", { name: "Start your own gathering", exact: true }))
    .toHaveAttribute("href", "/rooms/new");

  for (const section of ["Overview", "People", "Menu", "Shopping"]) {
    const navigation = page.getByRole("navigation", { name: "Gathering sections", exact: true });
    const link = navigation.getByRole("link", { name: section, exact: true });
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("tab") === section.toLowerCase(), { waitUntil: "networkidle" }),
      link.press("Enter")
    ]);
    await expect(link).toHaveAttribute("aria-current", "page");
    const bounds = await link.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    const widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(widths.scroll, `${section} overflows at 320px`).toBeLessThanOrEqual(widths.client + 1);
  }
  await expectNoAccessibilityViolations(page, "example-shopping-320");
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: "test-results/preview-navigation-320.png", fullPage: true, animations: "disabled" });
    await captureResponsiveEvidence(page, "example-shopping-navigation");
    await page.setViewportSize({ width: 320, height: 812 });
  }
  await header.getByRole("link", { name: "My gatherings", exact: true }).click();
  await page.waitForURL("**/preview?view=dashboard", { waitUntil: "networkidle" });
  await expect(header.getByRole("link", { name: "My gatherings", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(main.getByRole("link", { name: "New gathering", exact: true })).toBeVisible();
  await header.getByRole("link", { name: "New gathering", exact: true }).click();
  await expect(main.getByRole("button", { name: "Create example gathering" })).toBeVisible();
  await expect(header.getByRole("link", { name: "New gathering", exact: true })).toHaveAttribute("aria-current", "page");
  await main.getByLabel("Give it a name").fill("A mobile example");
  await main.getByRole("button", { name: "Create example gathering" }).click();
  await expect(main.getByRole("heading", { name: "A mobile example", exact: true })).toBeVisible();
  await main.getByRole("link", { name: "My gatherings", exact: true }).click();
  await expect(main.getByRole("heading", { name: "A mobile example", exact: true })).toBeVisible();
});

test("example grocery filters and assignments preserve changes across section navigation", async ({ page }) => {
  await page.goto("/preview?tab=shopping", { waitUntil: "domcontentloaded" });
  const main = page.getByRole("main");
  await main.getByRole("button", { name: "Unassigned", exact: true }).click();
  await main.getByLabel("Search groceries", { exact: true }).fill("nothing matches");
  await expect(main.getByRole("heading", { name: "Nothing on this list yet.", exact: true })).toBeVisible();
  await expect(main.getByText("Every grocery has a shopper.", { exact: true })).toHaveCount(0);
  await main.getByRole("button", { name: "Show everything", exact: true }).click();
  const apples = main.getByRole("checkbox", { name: "Apples Produce", exact: true });
  await apples.check();
  await main.getByLabel("Assign Apples", { exact: true }).selectOption("Jamie");
  await main.getByRole("button", { name: "My items", exact: true }).click();
  await expect(apples).toBeChecked();
  await main.getByLabel("Search groceries", { exact: true }).fill("nothing matches");
  await expect(main.getByRole("heading", { name: "Nothing on this list yet.", exact: true })).toBeVisible();
  await main.getByRole("button", { name: "Show everything", exact: true }).click();
  await expect(main.getByLabel("Search groceries", { exact: true })).toHaveValue("");
  await expect(apples).toBeChecked();
  await main.getByRole("navigation", { name: "Gathering sections", exact: true }).getByRole("link", { name: /^People\b/ }).click();
  await main.getByRole("navigation", { name: "Gathering sections", exact: true }).getByRole("link", { name: "Shopping", exact: true }).click();
  await expect(apples).toBeChecked();
  await expect(main.getByLabel("Assign Apples", { exact: true })).toHaveValue("Jamie");
  await main.getByLabel("Assign Rolled oats", { exact: true }).selectOption("Sam");
  await main.getByRole("button", { name: "Unassigned", exact: true }).click();
  await expect(main.getByRole("heading", { name: "Everyone has a part to play.", exact: true })).toBeVisible();
  await expect(main.getByText("Every grocery has a shopper.", { exact: true })).toBeVisible();
});
