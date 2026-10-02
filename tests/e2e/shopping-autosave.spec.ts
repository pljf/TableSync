import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { openOptionalCreationFields } from "./creation-fields";
import { signInAsHost } from "./host-auth";
import { fillGuestPreferences } from "./guest-preferences";
import { captureResponsiveEvidence, expectNoAccessibilityViolations } from "./quality-helpers";

async function saved(page: Page, change: () => Promise<unknown>) {
  const before = new URL(page.url()).searchParams.get("updated");
  await change();
  await expect.poll(() => new URL(page.url()).searchParams.get("updated"), { timeout: 20_000 }).not.toBe(before);
  await expect(page.locator('form[data-state="pending"]')).toHaveCount(0);
}

test("saves shopping immediately, retries failed and lost responses, and keeps progress through menu revision", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsHost(page);
  await page.goto("/rooms/new");
  await page.getByLabel("Title", { exact: true }).fill(`Shopping autosave ${randomUUID()}`);
  await openOptionalCreationFields(page, "gathering");
  await page.getByLabel("Description", { exact: true }).fill(`TableSync E2E ${process.env.TABLESYNC_E2E_RUN_ID ?? "local"}`);
  await page.getByLabel("Expected guests", { exact: true }).fill("2");
  await page.getByLabel("Total budget", { exact: true }).fill("150");
  await fillGuestPreferences(page, { name: "Shopping host", diet: "OMNIVORE" });
  await page.getByLabel("I can bring groceries or food", { exact: true }).check();
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.getByLabel("Guest invite link")).toBeVisible();
  const roomId = new URL(page.url()).pathname.split("/").at(-1)!;
  const shoppingPath = `/rooms/${roomId}/shopping`;
  await page.goto(`/rooms/${roomId}/plans`);
  await saved(page, () => page.getByRole("button", { name: "Generate plans", exact: true }).click());
  const plan = page.locator("article.plan-card").first();
  const planId = await plan.getAttribute("data-plan-id");
  await saved(page, () => plan.getByRole("button", { name: "Finalize plan", exact: true }).click());
  await page.goto(shoppingPath);
  const row = page.locator("article.shopping-row").first();
  const purchased = row.getByLabel("Purchased", { exact: true });
  const assignment = row.getByRole("combobox");
  const itemId = await row.locator('input[name="itemId"]').first().inputValue();
  const ingredientName = await row.locator(".shopping-main strong").innerText();
  const initialAssignment = await assignment.inputValue();
  expect(initialAssignment).not.toBe("");
  await expect(row.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await expect(row.getByRole("button", { name: /save assignment/i })).toHaveCount(0);

  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const matcher = (url: URL) => url.pathname === shoppingPath;
  await page.route(matcher, async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      await held;
      await route.abort("failed");
    } else await route.continue();
  });
  await purchased.check();
  await expect(row.locator('form[data-state="pending"]')).toHaveCount(1);
  await expect(purchased).toBeDisabled();
  await expect(row.getByRole("status")).toContainText("Saving");
  release();
  await expect(row.getByRole("alert")).toContainText("Check your connection and try again");
  await expect(purchased).toBeChecked();
  await expect(purchased).toHaveAttribute("data-dirty", "true");
  await page.unroute(matcher);
  await saved(page, () => row.getByRole("button", { name: "Retry save", exact: true }).click());
  await expect(row).toHaveClass(/is-purchased/);
  await expect(purchased).toHaveAttribute("data-dirty", "false");

  // Lose the response after the server commits, then retry the same assignment.
  await page.route(matcher, async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await assignment.selectOption("");
  await expect(row.getByRole("alert")).toBeVisible();
  await expect(assignment).toHaveValue("");
  await page.unroute(matcher);
  await saved(page, () => row.getByRole("button", { name: "Retry save", exact: true }).click());
  await expect(row.locator(".assignee")).toHaveText("Unassigned");
  await expect(purchased).toBeChecked();
  await page.reload();
  await expect(purchased).toBeChecked();
  await expect(assignment).toHaveValue("");
  await expectNoAccessibilityViolations(page, "shopping autosave");
  await captureResponsiveEvidence(page, "shopping-autosave");

  await page.goto(`/rooms/${roomId}/plans`);
  await page.getByText("Revise menu", { exact: true }).click();
  await page.getByLabel("I understand that shopping quantities may change when I finalize a menu.", { exact: true }).check();
  await saved(page, () => page.getByRole("button", { name: "Reopen menu voting", exact: true }).click());
  await page.goto(shoppingPath);
  await expect(page.getByRole("heading", { name: "Shopping is paused while the menu changes", exact: true })).toBeVisible();
  const retained = page.locator("article.shopping-row").filter({ has: page.getByText(ingredientName, { exact: true }) });
  // Shopping controls are absent while voting; the saved snapshot remains visible.
  await expect(page.locator("article.shopping-row.is-purchased")).toHaveCount(1);
  await expect(page.locator("article.shopping-row select, article.shopping-row input[type=checkbox]")).toHaveCount(0);
  await expect(retained).toHaveClass(/is-purchased/);
  await expect(retained.locator(".assignee")).toHaveText("Unassigned");
  await page.goto(`/rooms/${roomId}/plans`);
  await saved(page, () => page.locator(`article.plan-card[data-plan-id="${planId}"]`).getByRole("button", { name: "Finalize plan", exact: true }).click());
  await page.goto(shoppingPath);
  await expect(purchased).toBeChecked();
  await expect(assignment).toHaveValue("");
  await expect(row.locator('input[name="itemId"]').first()).toHaveValue(itemId);
});
