import { expect, test } from "@playwright/test";
import { signInAsHost } from "./host-auth";

test.skip(({ browserName }) => browserName !== "chromium", "One engine is sufficient for protocol-level boundary checks.");

test("security headers, hidden test auth, secure Cookie attributes, and Server Action origin checks", async ({
  context,
  page
}) => {
  const origin = process.env.TABLESYNC_E2E_BASE_URL ?? "http://localhost:3000";
  const remote = process.env.TABLESYNC_E2E_MODE === "remote";
  const cookieName = process.env.TABLESYNC_STAGING_SESSION_COOKIE_NAME
    ?? (remote ? "__Secure-tablesync-auth.session_token" : "tablesync-auth.session_token");

  const home = await page.request.get("/");
  expect(home.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(home.headers()["strict-transport-security"]).toContain("max-age=31536000");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(home.headers()["x-frame-options"]).toBe("DENY");
  expect(home.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(home.headers()["permissions-policy"]).toContain("camera=()");
  expect(home.headers()["x-powered-by"]).toBeUndefined();

  const hidden = await page.request.post("/api/test/auth/session", {
    headers: { Origin: origin, ...(remote ? {} : { "x-tablesync-e2e-key": "not-the-key" }) }
  });
  expect(hidden.status()).toBe(404);

  await signInAsHost(page);
  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === cookieName);
  // Assert only attributes so a failure cannot print a supplied staging token.
  expect(sessionCookie && { httpOnly: sessionCookie.httpOnly, sameSite: sessionCookie.sameSite, secure: sessionCookie.secure })
    .toEqual({ httpOnly: true, sameSite: "Lax", secure: remote });

  await page.goto("/rooms/new");
  await expect(page.getByRole("heading", { name: /create a room/i })).toBeVisible();
  const serverActionFields = await page.locator("form").evaluate((form) =>
    Object.fromEntries(Array.from(new FormData(form as HTMLFormElement)).map(([name, value]) => [name, String(value)]))
  );
  try {
    const crossOrigin = await page.request.post("/rooms/new", {
      headers: { Origin: "https://attacker.invalid" },
      multipart: {
        ...serverActionFields,
        title: "Cross-origin room must not exist",
        eventType: "DINNER",
        expectedGuests: "2"
      }
    });
    expect(crossOrigin.status()).toBeGreaterThanOrEqual(400);
  } catch (error) {
    expect(String(error)).toMatch(/ECONNRESET|socket|connection/i);
  }
  await page.goto("/dashboard");
  await expect(page.getByText("Cross-origin room must not exist", { exact: true })).toHaveCount(0);

  await page.route("**/api/auth/sign-out", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "unavailable" }) })
  );
  const signOut = page.getByRole("button", { name: /^(Sign out|End guest session)$/i });
  await expect(signOut).toBeVisible();
  const isGuest = (await signOut.textContent())?.trim() === "End guest session";
  let submitSignOut = signOut;
  if (isGuest) {
    await signOut.click();
    submitSignOut = page.getByRole("group", { name: "End guest session confirmation", exact: true })
      .getByRole("button", { name: "End session", exact: true });
  }
  const failedSignOut = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/sign-out"
  );
  await submitSignOut.click();
  expect((await failedSignOut).status()).toBe(503);
  await expect(page.locator(".compact-auth-action").getByRole("alert")).toHaveText(
    "Sign-out could not be completed. Please try again."
  );
  await expect(submitSignOut).toBeEnabled();
  expect((await context.cookies()).some((cookie) => cookie.name === sessionCookie!.name && cookie.value === sessionCookie!.value),
    "A failed sign-out must retain the existing host session").toBe(true);
  await expect(page.getByRole("heading", { name: /your meal rooms/i })).toBeVisible();
  await page.unroute("**/api/auth/sign-out");
});

test("remote deployment health is HTTPS, current, and ready", async ({ page }) => {
  test.skip(process.env.TABLESYNC_E2E_MODE !== "remote", "This gate applies only to remote staging.");
  const response = await page.request.get("/api/health", { headers: { "Cache-Control": "no-cache" } });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(new URL(response.url()).protocol).toBe("https:");
  await expect(response.json()).resolves.toMatchObject({
    status: "ready",
    environment: "staging",
    deploymentId: process.env.TABLESYNC_DEPLOYMENT_ID,
    commitSha: process.env.TABLESYNC_GIT_SHA,
    migration: process.env.TABLESYNC_EXPECTED_MIGRATION
  });
});
