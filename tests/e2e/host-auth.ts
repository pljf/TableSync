import { expect, type Page } from "@playwright/test";

export async function signInAsHost(page: Page) {
  const origin = process.env.TABLESYNC_E2E_BASE_URL ?? "http://localhost:3000";
  if (process.env.TABLESYNC_E2E_MODE === "remote") {
    const value = process.env.TABLESYNC_STAGING_SESSION_COOKIE;
    const name = process.env.TABLESYNC_STAGING_SESSION_COOKIE_NAME ?? "__Secure-tablesync-auth.session_token";
    if (!value) throw new Error("TABLESYNC_STAGING_SESSION_COOKIE is required for remote acceptance.");
    await page.context().addCookies([
      { name, value, url: origin, httpOnly: true, sameSite: "Lax", secure: true }
    ]);
  } else {
    const key = process.env.TABLESYNC_E2E_AUTH_KEY;
    if (!key) throw new Error("TABLESYNC_E2E_AUTH_KEY is required for the isolated local test identity.");
    const response = await page.request.post("/api/test/auth/session", {
      headers: { Origin: origin, "x-tablesync-e2e-key": key }
    });
    expect(response.status()).toBe(200);
  }
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Good things are on the way.", exact: true })).toBeVisible();
}
