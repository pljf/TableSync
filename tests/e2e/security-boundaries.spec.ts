import { expect, test } from "@playwright/test";

test.skip(({ browserName }) => browserName !== "chromium", "One engine is sufficient for protocol-level boundary checks.");

test("security headers, hidden test auth, secure Cookie attributes, and Server Action origin checks", async ({
  context,
  page
}) => {
  const origin = process.env.TABLESYNC_E2E_BASE_URL ?? "http://localhost:3000";
  const remote = process.env.TABLESYNC_E2E_MODE === "remote";
  const key = process.env.TABLESYNC_E2E_AUTH_KEY;
  const remoteCookie = process.env.TABLESYNC_STAGING_SESSION_COOKIE;
  const cookieName = process.env.TABLESYNC_STAGING_SESSION_COOKIE_NAME ?? "tablesync-auth.session_token";
  if (!remote && !key) throw new Error("TABLESYNC_E2E_AUTH_KEY is required.");
  if (remote && !remoteCookie) throw new Error("TABLESYNC_STAGING_SESSION_COOKIE is required.");

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

  if (remote) {
    await context.addCookies([
      { name: cookieName, value: remoteCookie!, url: origin, httpOnly: true, sameSite: "Lax", secure: true }
    ]);
  } else {
    const login = await page.request.post("/api/test/auth/session", {
      headers: { Origin: origin, "x-tablesync-e2e-key": key! }
    });
    expect(login.status()).toBe(200);
  }
  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === cookieName);
  expect(sessionCookie).toMatchObject({ httpOnly: true, sameSite: "Lax", secure: remote });

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
  await page.getByRole("button", { name: /^sign out$/i }).click();
  await expect(page.locator(".compact-auth-error[role='alert']")).toHaveText(
    "Sign-out could not be completed. Please try again."
  );
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
