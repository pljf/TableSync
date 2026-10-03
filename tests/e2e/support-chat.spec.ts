import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("support answers a real product question and opens its source", async ({ page }) => {
  await page.goto("/help");
  await expect(page.getByRole("heading", { name: /A little help,\s*for your next gathering\./ })).toBeVisible();
  await expect(page.getByText("Hi, I’m your TableSync assistant.")).toBeVisible();
  await expect(page.getByText("Help guides · No sign-in needed")).toBeVisible();
  await page.getByRole("button", { name: "Will changing the menu update my shopping list?" }).click();
  const answer = page.locator(".support-message-assistant").last();
  await expect(answer).toContainText(/shopping list/i, { timeout: 30000 });
  await expect(answer).toContainText("Related guide");
  await expect(answer.locator(".support-sources a").first()).toBeVisible();
  const source = answer.locator(".support-sources a").first();
  const destination = await source.getAttribute("href");
  await source.click();
  await expect(page.locator(destination!.replace("/help", ""))).toHaveAttribute("open", "");
  await page.locator(destination!.replace("/help", "")).locator("summary").click();
  await expect(page.locator(destination!.replace("/help", ""))).not.toHaveAttribute("open", "");
  const [sourceTab] = await Promise.all([
    page.context().waitForEvent("page"),
    source.click({ modifiers: [process.platform === "darwin" ? "Meta" : "Control"] })
  ]);
  await expect(sourceTab).toHaveURL(new URL(destination!, page.url()).href);
  await sourceTab.waitForLoadState("domcontentloaded");
  await expect(page.locator(destination!.replace("/help", ""))).not.toHaveAttribute("open", "");
  await sourceTab.close();
  await source.click();
  await expect(page.locator(destination!.replace("/help", ""))).toHaveAttribute("open", "");
  await page.getByLabel("Ask the TableSync assistant").fill("What about items already bought?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".support-message-assistant")).toHaveCount(2, { timeout: 30000 });
  await page.getByRole("button", { name: "Start a new conversation" }).click();
  await expect(page.locator(".support-message")).toHaveCount(0);
  expect(await page.locator(".support-transcript").evaluate((element) => element.scrollTop)).toBe(0);
});

test("support exposes a recoverable network error without losing the question", async ({ page }) => {
  await page.goto("/help");
  await page.route("**/api/support", async (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await page.getByLabel("Ask the TableSync assistant").fill("How do I invite friends?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".support-error")).toBeVisible();
  await expect(page.locator(".support-message-user")).toHaveCount(1);
  await page.unroute("**/api/support");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".support-message-assistant")).toHaveCount(1, { timeout: 30000 });
  await expect(page.locator(".support-message-user")).toHaveCount(1);
});

test("support renders both tasks and sources, then states its action boundary", async ({ page }) => {
  await page.goto("/help");
  const input = page.getByLabel("Ask the TableSync assistant");
  await input.fill("How do I invite friends and remove groceries I already have?");
  await page.getByRole("button", { name: "Send question" }).click();
  const answer = page.locator(".support-message-assistant").last();
  await expect(answer).toContainText("invite link", { timeout: 30000 });
  await expect(answer).toContainText(/not (?:currently )?(?:available|supported)|does not (?:currently )?(?:support|include)|cannot (?:manually )?(?:edit|add|remove)/i);
  const sources = answer.locator(".support-sources a");
  await expect(sources).toHaveCount(2);
  await expect(sources.nth(0)).toHaveAttribute("href", "/help#invite-guests");
  await expect(sources.nth(1)).toHaveAttribute("href", "/help#edit-shopping");
  await input.fill("Invite my friends for me.");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".support-message-assistant").last()).toContainText("I cannot send invitations or messages for you", { timeout: 30000 });
});

test("global support preserves conversation on collapse and returns keyboard focus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ask TableSync" }).click();
  await expect(page.getByLabel("Ask the TableSync assistant")).toBeFocused();
  await page.getByLabel("Ask the TableSync assistant").fill("How long does a gathering last?");
  await page.keyboard.press("Enter");
  await expect(page.locator(".support-message-assistant")).toContainText(/7|seven/i, { timeout: 30000 });
  await page.getByRole("button", { name: "Close assistant" }).click();
  await expect(page.getByRole("button", { name: "Ask TableSync" })).toBeFocused();
  await page.getByRole("button", { name: "Ask TableSync" }).click();
  await expect(page.locator(".support-message-assistant")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("complementary", { name: "TableSync assistant" })).toBeHidden();
});

test("support fits a phone viewport and passes accessibility checks", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/help");
  const results = await new AxeBuilder({ page }).include(".support-page").analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
  await page.getByLabel("Ask the TableSync assistant").fill(" ");
  await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
});
