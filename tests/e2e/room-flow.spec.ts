import { expect, test } from "@playwright/test";

test("demo room exposes the core planning workflow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /open demo/i }).click();
  await expect(page.getByRole("heading", { name: /friday hotpot night/i })).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/rooms\/[^/]+\/plans$/),
    page.getByRole("link", { name: /^plans$/i }).click()
  ]);
  await expect(page.getByText(/^menu plans$/i)).toBeVisible();
  await expect(page.getByText(/score/i).first()).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/rooms\/[^/]+\/shopping$/),
    page.getByRole("link", { name: /^shopping$/i }).click()
  ]);
  await expect(page.getByText(/^shopping workflow$/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/total estimate/i)).toBeVisible();
});
