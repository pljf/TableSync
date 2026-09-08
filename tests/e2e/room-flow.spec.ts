import { expect, test } from "@playwright/test";

test("retired demo redirects to guest entry and no longer exposes room details", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("button", { name: "Continue as guest", exact: true })).toBeVisible();
  await page.goto("/rooms/room-friday-hotpot");
  await expect(page.getByRole("heading", { name: "This page is unavailable", exact: true })).toBeVisible();
  await page.goto("/preferences");
  await expect(page.getByRole("heading", { name: "Open your meal invitation", exact: true })).toBeVisible();
});
