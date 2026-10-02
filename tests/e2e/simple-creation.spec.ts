import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signInAsHost } from "./host-auth";
import { expectNoAccessibilityViolations } from "./quality-helpers";

const marker = "TableSync E2E " + (process.env.TABLESYNC_E2E_RUN_ID ?? "local");

test.describe("simple gathering creation", () => {
  test.setTimeout(120_000);

  test("keeps the chosen occasion through guest sign-in and preserves optional drafts", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const brunch = page.getByRole("button", { name: "Brunch", exact: true });
    await expect(brunch).toBeEnabled();
    await brunch.click();
    await expect(brunch).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Make it a plan", exact: true })).toHaveAttribute("href", "/rooms/new?eventType=BRUNCH");
    await page.getByRole("link", { name: "Make it a plan", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\?create=1&eventType=BRUNCH$/);
    const sessionResponse = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/sign-in/anonymous");
    await page.getByRole("main").getByRole("button", { name: "Continue as guest", exact: true }).click();
    expect((await sessionResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/rooms\/new\?eventType=BRUNCH$/, { timeout: 20_000 });
    await expect(page.getByRole("combobox", { name: "Event type", exact: true })).toHaveValue("BRUNCH");

    const title = "Simple brunch " + randomUUID();
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Name", { exact: true }).fill("Brunch host");
    await page.getByLabel("Allergies", { exact: true }).fill("peanut");
    const gatheringDetails = page.locator('details[data-optional-section="gathering"]');
    const preferences = page.locator('details[data-optional-section="preferences"]');
    await expect(gatheringDetails).not.toHaveAttribute("open", "");
    await expect(preferences).not.toHaveAttribute("open", "");
    await expectNoAccessibilityViolations(page, "simple-creation");

    await gatheringDetails.locator("summary").click();
    await page.getByLabel("Description", { exact: true }).fill(marker);
    await gatheringDetails.locator("summary").click();
    await preferences.locator("summary").click();
    await page.getByLabel("Notes", { exact: true }).fill("Keep this draft when I close the details.");
    await page.getByLabel("Email optional", { exact: true }).fill("invalid-email");
    await preferences.locator("summary").click();
    await page.getByLabel("Title", { exact: true }).fill("");
    await page.getByRole("button", { name: "Create room", exact: true }).click();
    await expect(preferences).toHaveAttribute("open", "");
    await expect(page.getByLabel("Title", { exact: true })).toBeFocused();
    await page.getByLabel("Title", { exact: true }).fill(title);
    await preferences.locator("summary").click();
    await page.getByRole("button", { name: "Create room", exact: true }).click();
    await expect(preferences).toHaveAttribute("open", "");
    await expect(page.getByLabel("Email optional", { exact: true })).toBeFocused();
    await expect(page.getByLabel("Notes", { exact: true })).toHaveValue("Keep this draft when I close the details.");
    await expect(page.getByLabel("Allergies", { exact: true })).toHaveValue("peanut");
    await page.getByLabel("Email optional", { exact: true }).fill("");
    await gatheringDetails.locator("summary").click();
    await expect(page.getByLabel("Description", { exact: true })).toHaveValue(marker);
    await gatheringDetails.locator("summary").click();
    await preferences.locator("summary").click();
    await page.getByRole("button", { name: "Create room", exact: true }).click();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".live-room-header .live-section-label")).toHaveText("Brunch · A place for everyone");
  });

  test("keeps required fields and native optional disclosures usable without JavaScript", async ({ browser, page }) => {
    await signInAsHost(page);
    const nativeContext = await browser.newContext({ javaScriptEnabled: false });
    await nativeContext.addCookies(await page.context().cookies());
    const nativePage = await nativeContext.newPage();
    try {
      await nativePage.goto("/rooms/new?eventType=BBQ", { waitUntil: "domcontentloaded" });
      await expect(nativePage.getByRole("region", { name: "Loading page", exact: true })).toHaveCount(0);
      await expect(nativePage.getByRole("combobox", { name: "Event type", exact: true })).toHaveValue("BBQ");
      const requiredFields = nativePage.locator("form [required]");
      expect(await requiredFields.count()).toBe(3);
      for (const field of await requiredFields.all()) await expect(field).toBeVisible();
      const title = "Native BBQ " + randomUUID();
      await nativePage.getByLabel("Title", { exact: true }).fill(title);
      await nativePage.getByLabel("Name", { exact: true }).fill("Native host");
      await nativePage.getByLabel("Allergies", { exact: true }).fill("peanut");
      const details = nativePage.locator('details[data-optional-section="gathering"]');
      await details.locator("summary").press("Enter");
      await expect(nativePage.getByLabel("Description", { exact: true })).toBeVisible();
      await nativePage.getByLabel("Description", { exact: true }).fill(marker);
      await details.locator("summary").press("Enter");
      await expect(nativePage.getByLabel("Title", { exact: true })).toHaveValue(title);
      // Driver inspection confirms closed native sections keep their named
      // controls. The existing client action wrapper is not a no-JS submit path.
      const values = await nativePage.locator("form").evaluate((form) => {
        const data = new FormData(form as HTMLFormElement);
        return { title: data.get("title"), eventType: data.get("eventType"), name: data.get("name"), allergies: data.get("allergies"), description: data.get("description") };
      });
      expect(values).toEqual({ title, eventType: "BBQ", name: "Native host", allergies: "peanut", description: marker });
    } finally {
      await nativeContext.close();
    }
  });
});
