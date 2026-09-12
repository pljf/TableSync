import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { expect, test, type BrowserContext, type Page, type Response, type Route } from "@playwright/test";
import { dishCatalog } from "../../src/lib/seed-data";
import { fillGuestPreferences, type GuestPreferences } from "./guest-preferences";

const e2eRunMarker = `TableSync E2E ${process.env.TABLESYNC_E2E_RUN_ID ?? "local"}`;
const origin = process.env.TABLESYNC_E2E_BASE_URL ?? "http://localhost:3000";

async function sessionCookie(context: BrowserContext) {
  return (await context.cookies()).find((cookie) => cookie.name.endsWith("tablesync-auth.session_token"));
}

async function assertGuestSessionSecurity(page: Page, response: Response) {
  let sessionResponse = response;
  if (sessionResponse.status() === 429) {
    // Serial browser projects share the real local IP limit. Honor one explicit
    // server cooldown; a second 429 or any other failure must still fail the test.
    const retryAfter = Number(await sessionResponse.headerValue("x-retry-after"));
    expect(Number.isFinite(retryAfter), "A rate limit must provide a finite X-Retry-After cooldown").toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
    const error = page.getByRole("main").getByRole("alert");
    await expect(error).toHaveText("Guest access could not start. Please try again.");
    await expect(error).toBeVisible();
    const button = page.getByRole("main").getByRole("button", { name: "Continue as guest", exact: true }).first();
    await expect(button).toBeEnabled();
    expect(Boolean(await sessionCookie(page.context())), "A rate-limited sign-in must not create a host session").toBe(false);
    test.info().annotations.push({ type: "rate-limit cooldown", description: `Honored X-Retry-After=${retryAfter} seconds before one guest sign-in retry.` });
    await delay(retryAfter * 1_000 + 250);
    const retryResponse = page.waitForResponse((candidate) =>
      candidate.request().method() === "POST" && new URL(candidate.url()).pathname === "/api/auth/sign-in/anonymous"
    );
    await button.click();
    sessionResponse = await retryResponse;
  }
  expect(sessionResponse.status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Good things are on the way.", exact: true })).toBeVisible();
  const cookie = await sessionCookie(page.context());
  expect(cookie ? { httpOnly: cookie.httpOnly, secure: cookie.secure } : undefined)
    .toEqual({ httpOnly: true, secure: origin.startsWith("https:") });
  const setCookies = (await sessionResponse.headersArray()).filter((header) =>
    header.name.toLowerCase() === "set-cookie" && header.value.startsWith(`${cookie!.name}=`)
  );
  expect(setCookies.length, "Guest sign-in must set exactly one host session cookie").toBe(1);
  // Check only attributes so a failing assertion cannot print the session token.
  const attributes = setCookies[0].value.split(";").slice(1).map((attribute) => attribute.trim().toLowerCase());
  expect(attributes).toContain("samesite=lax");
  expect(attributes).toContain("httponly");
  expect(attributes).toContain("path=/");
  expect(attributes.includes("secure")).toBe(origin.startsWith("https:"));
  const nativeWindowsWebKit = process.platform === "win32"
    && page.context().browser()?.browserType().name() === "webkit"
    && test.info().project.use.channel !== "webkit-wsl";
  // Playwright itself marks Lax cookie metadata reporting as unsupported here:
  // https://github.com/microsoft/playwright/blob/main/tests/library/browsercontext-cookies.spec.ts#L122
  // The actual Set-Cookie security attributes above remain required on every engine.
  if (!nativeWindowsWebKit) expect(cookie!.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie.includes("tablesync-auth.session_token")), "JavaScript must not read the host session cookie").toBe(false);
  if (!origin.startsWith("https:")) expect(cookie?.name).toBe("tablesync-auth.session_token");
  return cookie!;
}

async function continueAsGuest(page: Page, path: "/" | "/auth" = "/") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const signInResponse = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/sign-in/anonymous"
  );
  await page.getByRole("main").getByRole("button", { name: "Continue as guest", exact: true }).first().click();
  return assertGuestSessionSecurity(page, await signInResponse);
}

async function createGuestRoom(page: Page, title: string, options: { publicShare?: boolean; retryTransportError?: boolean; creator?: GuestPreferences } = {}) {
  await page.getByRole("main").getByRole("link", { name: "New room", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Description", { exact: true }).fill(e2eRunMarker);
  await page.getByRole("combobox", { name: "Event type", exact: true }).selectOption("DINNER");
  await page.getByLabel("Expected guests", { exact: true }).fill("2");
  await page.getByLabel("Total budget", { exact: true }).fill("120");
  const creator: GuestPreferences = options.creator ?? { name: "Guest room creator", diet: "OMNIVORE" };
  await fillGuestPreferences(page, creator);
  if (options.publicShare) await page.getByLabel("Public share page", { exact: true }).check();
  if (options.retryTransportError) {
    const rejectCreation = async (route: Route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 503, contentType: "text/plain", body: "Temporarily unavailable" });
      } else {
        await route.continue();
      }
    };
    await page.route("**/rooms/new", rejectCreation);
    try {
      await page.getByRole("button", { name: "Create room", exact: true }).click();
      const error = page.locator('.action-feedback[data-state="error"][role="alert"]');
      await expect(error).toHaveText("We could not confirm that change. Check your connection and try again.");
      await expect(error).toBeFocused();
      await expect(page.getByLabel("Title", { exact: true })).toHaveValue(title);
      await expect(page.getByLabel("Description", { exact: true })).toHaveValue(e2eRunMarker);
      await expect(page.getByRole("combobox", { name: "Event type", exact: true })).toHaveValue("DINNER");
      await expect(page.getByLabel("Expected guests", { exact: true })).toHaveValue("2");
      await expect(page.getByLabel("Total budget", { exact: true })).toHaveValue("120");
      await expect(page.getByLabel("Name", { exact: true })).toHaveValue(creator.name);
      await expect(page.getByRole("combobox", { name: "Diet type", exact: true })).toHaveValue(creator.diet);
      await expect(page.getByLabel("Allergies", { exact: true })).toHaveValue(creator.allergies ?? "");
      await expect(page.getByRole("button", { name: "Create room", exact: true })).toBeEnabled();
      await expect(page).toHaveURL(/\/rooms\/new$/);
    } finally {
      await page.unroute("**/rooms/new", rejectCreation);
    }
  }
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({ timeout: 20_000 });
  const roomId = new URL(page.url()).pathname.match(/^\/rooms\/([^/]+)$/)?.[1];
  if (!roomId) throw new Error("Room creation did not open a room overview.");
  return roomId;
}

async function submitMutation(page: Page, path: string, submit: () => Promise<void>, inspectPending?: () => Promise<void>) {
  const previousMutationId = new URL(page.url()).searchParams.get("updated");
  let releaseRequest!: () => void;
  const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve; });
  const matchesPath = (url: URL) => url.pathname === path;
  const holdMutation = async (route: Route) => {
    if (route.request().method() === "POST") await requestGate;
    await route.continue();
  };
  await page.route(matchesPath, holdMutation);
  try {
    await submit();
    const pendingButton = page.locator('button[aria-busy="true"]').first();
    await expect(pendingButton).toBeVisible();
    await expect(pendingButton).toBeDisabled();
    await expect(page.locator('.action-feedback[data-state="pending"][role="status"]')).toBeVisible();
    if (inspectPending) await inspectPending();
    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname === path
    );
    releaseRequest();
    expect((await responsePromise).status(), "The room change should complete successfully").toBeLessThan(400);
    await expect.poll(() => new URL(page.url()).searchParams.get("updated"), { timeout: 20_000 }).not.toBe(previousMutationId);
    await page.waitForLoadState("networkidle");
  } finally {
    releaseRequest();
    await page.unroute(matchesPath, holdMutation);
  }
}

test.describe("public guest access", () => {
  test.setTimeout(120_000);

  test("keeps rooms in a private browser session and confirms before ending access", async ({ browser, context, page }) => {
    const firstCookie = await continueAsGuest(page);
    const title = `Guest privacy ${randomUUID()}`;
    const roomId = await createGuestRoom(page, title, {
      retryTransportError: true,
      creator: { name: "Private room creator", diet: "VEGAN", allergies: "soy" }
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await page.goto("/demo");
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.locator(".room-card")).toHaveCount(1);
    expect((await sessionCookie(context))?.value === firstCookie.value, "Returning through /demo must preserve the guest session").toBe(true);

    const secondContext = await browser.newContext({ baseURL: origin });
    try {
      const secondPage = await secondContext.newPage();
      const secondCookie = await continueAsGuest(secondPage, "/auth");
      expect(secondCookie.value === firstCookie.value, "Separate browsers must receive different guest sessions").toBe(false);
      await expect(secondPage.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
      await expect(secondPage.getByRole("heading", { name: "No meal rooms yet", exact: true })).toBeVisible();
      await expect(secondPage.locator(".room-card")).toHaveCount(0);
      for (const suffix of ["", "/plans", "/shopping", "/edit"]) {
        await secondPage.goto(`/rooms/${roomId}${suffix}`);
        await expect(secondPage.getByRole("heading", { name: "This page is unavailable", exact: true })).toBeVisible();
        await expect(secondPage.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
      }

      await secondContext.addCookies([{ ...secondCookie, value: "tampered-guest-session" }]);
      await secondPage.goto("/dashboard");
      await expect(secondPage).toHaveURL(/\/auth$/, { timeout: 20_000 });
      await expect(secondPage.getByRole("main").getByRole("button", { name: "Continue as guest", exact: true })).toBeVisible();
    } finally {
      await secondContext.close();
    }

    const endSessionTrigger = page.getByRole("button", { name: "End guest session", exact: true });
    await endSessionTrigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Keep guest session", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("group", { name: "End guest session confirmation", exact: true })).toHaveCount(0);
    await expect(endSessionTrigger).toBeFocused();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Keep guest session", exact: true }).click();
    await expect(endSessionTrigger).toBeFocused();
    await page.reload();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    expect((await sessionCookie(context))?.value === firstCookie.value, "Canceling must keep access to existing rooms").toBe(true);

    await page.getByRole("button", { name: "End guest session", exact: true }).click();
    await page.getByRole("button", { name: "End session", exact: true }).click();
    await expect(page).toHaveURL(new URL("/", origin).href, { timeout: 20_000 });
    expect(Boolean(await sessionCookie(context)), "Ending a guest session must clear the host cookie").toBe(false);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth$/, { timeout: 20_000 });
  });

  test("can explore preferences, voting, finalization, and shopping without a login", async ({ context, page }) => {
    await continueAsGuest(page, "/auth");
    const title = `Guest dinner ${randomUUID()}`;
    const privateNote = `Private serving note ${randomUUID()}`;
    const roomId = await createGuestRoom(page, title, {
      publicShare: true,
      creator: {
        name: "Guest host diner", diet: "VEGETARIAN", allergies: "peanut",
        likes: "tofu, rice", notes: privateNote, canBring: true
      }
    });
    await expect(page.getByRole("link", { name: "Share", exact: true })).toHaveCount(0);
    const progress = page.getByRole("region", { name: "Room progress", exact: true });
    await expect(progress.locator('[aria-current="step"]')).toContainText("Preferences");
    await expect(page.getByText("1 of 2 guests have responded.", { exact: false })).toBeVisible();
    await expect(page.locator(".guest-row")).toHaveCount(1);
    await expect(page.locator(".guest-row")).toContainText("Guest host diner");
    await expect(page.getByRole("region", { name: "Guest food preferences", exact: true })).toContainText("Vegetarian: 1");
    await expect(page.getByRole("region", { name: "Guest food preferences", exact: true })).toContainText("peanut");
    await expect(page.getByRole("region", { name: "Next step", exact: true }).locator("a.button:not(.secondary)")).toHaveText("Open menu planning");
    await page.getByRole("link", { name: "My preferences", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your preferences", exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Guest host diner");
    await expect(page.getByRole("combobox", { name: "Diet type", exact: true })).toHaveValue("VEGETARIAN");
    await expect(page.getByLabel("Allergies", { exact: true })).toHaveValue("peanut");
    await expect(page.getByLabel("Liked ingredients", { exact: true })).toHaveValue("tofu, rice");
    await expect(page.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue(privateNote);
    await expect(page.getByLabel("I can bring groceries or food", { exact: true })).toBeChecked();
    await page.waitForLoadState("networkidle");
    expect((await context.cookies()).some((cookie) => cookie.name === "tablesync_guest_session")).toBe(true);

    await page.getByRole("link", { name: "View room overview", exact: true }).click();
    await expect(page.getByRole("link", { name: "Edit room", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Open menu planning", exact: true }).click();
    await submitMutation(page, `/rooms/${roomId}/plans`, () =>
      page.getByRole("button", { name: "Generate plans", exact: true }).click()
    );
    await expect(page.locator("article.plan-card")).toHaveCount(3);
    // Validate the displayed menus against the seeded recipe ingredients, so
    // the creator's saved diet and allergy must reach menu generation.
    for (const card of await page.locator("article.plan-card").all()) {
      const names = await card.locator(".dish-list li > span").allTextContents();
      const dishes = names.map((name) => dishCatalog.find((dish) => dish.name === name));
      expect(dishes.every(Boolean), "Every proposed dish should come from the recipe catalog").toBe(true);
      const safeForCreator = (dish: NonNullable<typeof dishes[number]>) =>
        dish.ingredients.every(({ ingredient }) => ingredient.category !== "MEAT_SEAFOOD");
      expect(dishes.some((dish) => dish?.category === "MAIN" && safeForCreator(dish)), "Every menu must cover the creator's vegetarian main").toBe(true);
      expect(dishes.some((dish) => dish?.category === "SIDE" && safeForCreator(dish)), "Every menu must cover the creator's vegetarian side").toBe(true);
      for (const dish of dishes) {
        expect(dish!.ingredients.flatMap(({ ingredient }) => [ingredient.name, ...ingredient.tags]).join(" ")).not.toMatch(/peanut/i);
      }
    }
    await expect(progress.locator('[aria-current="step"]')).toContainText("Menu & voting");
    await page.getByRole("link", { name: "Shopping", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No shopping list yet", exact: true })).toBeVisible();
    await expect(progress.locator('[aria-current="step"]')).toContainText("Menu & voting");
    await page.getByRole("link", { name: "Choose a menu", exact: true }).click();
    await expect(page.locator("article.plan-card")).toHaveCount(3);
    const firstPlanId = await page.locator("article.plan-card").first().getAttribute("data-plan-id");
    expect(firstPlanId).toBeTruthy();
    const plan = page.locator(`article.plan-card[data-plan-id="${firstPlanId}"]`);
    await plan.getByRole("button", { name: "Veto", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(plan.getByRole("alert")).toHaveText("Explain the Veto so the host and other guests can respond.");
    await expect(plan.getByLabel("Veto reason", { exact: true })).toBeFocused();
    await expect(plan.getByLabel("Veto reason", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await plan.getByLabel("Veto reason", { exact: true }).fill("I prefer another menu.");
    await expect(plan.getByRole("alert")).toHaveCount(0);
    const votingViewport = page.viewportSize();
    await page.setViewportSize({ width: 375, height: 812 });
    const initialVoteSize = await plan.getByRole("button", { name: "Like", exact: true }).boundingBox();
    expect(initialVoteSize).not.toBeNull();
    await submitMutation(page, `/rooms/${roomId}/plans`,
      () => plan.getByRole("button", { name: "Like", exact: true }).click(),
      async () => {
        await expect(plan.locator('.vote-form button[aria-busy="true"]')).toHaveCount(1);
        await expect(plan.getByRole("button", { name: "Neutral", exact: true })).toBeDisabled();
        await expect(plan.getByRole("button", { name: "Veto", exact: true })).toBeDisabled();
        const pendingVoteSize = await plan.locator('.vote-form button[aria-busy="true"]').boundingBox();
        expect(pendingVoteSize).not.toBeNull();
        expect(Math.abs(pendingVoteSize!.width - initialVoteSize!.width), "Saving should not resize the vote control").toBeLessThanOrEqual(1);
        expect(Math.abs(pendingVoteSize!.height - initialVoteSize!.height), "Saving should not resize the vote control").toBeLessThanOrEqual(1);
        const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
        expect(dimensions.content, "Pending feedback must fit the 375px viewport").toBeLessThanOrEqual(dimensions.viewport + 1);
      }
    );
    await expect(plan.getByLabel("Veto reason", { exact: true })).toHaveValue("");
    await expect(plan.getByRole("button", { name: "Like", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(plan.getByText("Your current vote:", { exact: false })).toContainText("Like");
    if (votingViewport) await page.setViewportSize(votingViewport);
    await submitMutation(page, `/rooms/${roomId}/plans`, () =>
      plan.getByRole("button", { name: "Finalize plan", exact: true }).click()
    );
    await expect(page.getByText("Finalized", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Share", exact: true })).toBeVisible();
    await expect(progress.locator('[aria-current="step"]')).toContainText("Shopping");
    await page.getByRole("link", { name: "Open shopping", exact: true }).click();
    const firstShoppingRow = page.locator("article.shopping-row").first();
    await expect(firstShoppingRow).toBeVisible();
    await expect(firstShoppingRow.locator(".assignee")).toHaveText("Guest host diner");
    await expect(firstShoppingRow.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    await firstShoppingRow.getByLabel("Purchased", { exact: true }).check();
    await expect(firstShoppingRow.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
    await submitMutation(page, `/rooms/${roomId}/shopping`, () =>
      firstShoppingRow.getByRole("button", { name: "Save", exact: true }).click()
    );
    await page.reload();
    await expect(page.locator("article.shopping-row").first().getByLabel("Purchased", { exact: true })).toBeChecked();
    await expect(page.getByRole("button", { name: "Purchased 1", exact: true })).toBeVisible();

    const shoppingRows = page.locator("article.shopping-row");
    const itemCount = await shoppingRows.count();
    expect(itemCount, "The generated menu should need more than one shopping item").toBeGreaterThan(1);
    const completion = page.locator('.shopping-complete[role="status"]');
    await expect(completion).toHaveCount(0);
    for (let index = 1; index < itemCount; index += 1) {
      const row = shoppingRows.nth(index);
      await row.getByLabel("Purchased", { exact: true }).check();
      await expect(completion, "Unsaved checks must not announce completion").toHaveCount(0);
      if (index === itemCount - 1) {
        await expect(page.getByRole("button", { name: `Purchased ${itemCount - 1}`, exact: true })).toBeVisible();
      }
      await submitMutation(page, `/rooms/${roomId}/shopping`,
        () => row.getByRole("button", { name: "Save", exact: true }).click(),
        async () => { await expect(completion, "A pending save must not announce completion").toHaveCount(0); }
      );
      await expect(page.getByRole("button", { name: `Purchased ${index + 1}`, exact: true })).toBeVisible();
    }
    await expect(completion.getByRole("heading", { name: "Shopping complete", exact: true })).toBeVisible();
    await page.reload();
    await expect(completion).toBeVisible();
    await expect(page.locator("article.shopping-row.is-purchased")).toHaveCount(itemCount);

    const lastShoppingRow = shoppingRows.last();
    await lastShoppingRow.getByLabel("Purchased", { exact: true }).uncheck();
    await expect(completion, "An unsaved change must retain confirmed completion").toBeVisible();
    await submitMutation(page, `/rooms/${roomId}/shopping`,
      () => lastShoppingRow.getByRole("button", { name: "Save", exact: true }).click(),
      async () => { await expect(completion).toBeVisible(); }
    );
    await expect(completion).toHaveCount(0);
    await page.reload();
    await expect(completion).toHaveCount(0);
    await expect(shoppingRows.last().getByLabel("Purchased", { exact: true })).not.toBeChecked();

    await page.getByRole("button", { name: "End guest session", exact: true }).click();
    await page.getByRole("button", { name: "End session", exact: true }).click();
    await expect(page).toHaveURL(new URL("/", origin).href, { timeout: 20_000 });
    expect(Boolean(await sessionCookie(context)), "Ending a guest session must clear the host cookie").toBe(false);
    expect((await context.cookies()).some((cookie) => cookie.name === "tablesync_guest_session")).toBe(false);
    await page.goto(`/rooms/${roomId}`);
    await expect(page.getByRole("heading", { name: "This page is unavailable", exact: true })).toBeVisible();
    await page.goto(`/share/${roomId}`);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Final menu", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shopping summary", exact: true })).toBeVisible();
    await expect(page.getByText("Guest host diner", { exact: true })).toHaveCount(0);
    await expect(page.getByText(privateNote, { exact: false })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
  });

  test("rejects cross-origin session creation and lets a failed guest sign-in retry", async ({ context, page }) => {
    const crossOrigin = await page.request.post("/api/auth/sign-in/anonymous", {
      headers: { Origin: "https://attacker.invalid" },
      data: {}
    });
    expect(crossOrigin.status()).toBeGreaterThanOrEqual(400);
    expect(crossOrigin.status()).toBeLessThan(500);
    expect(Boolean(await sessionCookie(context)), "A rejected origin must not receive a session").toBe(false);

    await page.route("**/api/auth/sign-in/anonymous", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Unavailable" }) })
    );
    await page.goto("/auth");
    const button = page.getByRole("main").getByRole("button", { name: "Continue as guest", exact: true });
    await button.click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Guest access could not start. Please try again.");
    await expect(button).toBeEnabled();
    await expect(page).toHaveURL(/\/auth$/);
    expect(Boolean(await sessionCookie(context)), "A failed sign-in must not receive a session").toBe(false);

    await page.unroute("**/api/auth/sign-in/anonymous");
    const retryResponse = page.waitForResponse((response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/sign-in/anonymous"
    );
    await button.click();
    const cookie = await assertGuestSessionSecurity(page, await retryResponse);

    // Exercise a real cross-site form navigation, in addition to the explicit
    // Origin-header test above. The attacker page is fulfilled locally.
    const attackerOrigin = "http://attacker.invalid";
    await page.route(`${attackerOrigin}/**`, (route) => route.fulfill({
      contentType: "text/html",
      body: `<form method="post" action="${origin}/api/auth/sign-out"><button>Submit cross-site request</button></form>`
    }));
    await page.goto(`${attackerOrigin}/`);
    const rejectedSignOut = page.waitForResponse((response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/sign-out"
    );
    // Receiving the 403 response can precede the form navigation completing in
    // WebKit. Let that document load before navigating back to the dashboard.
    const rejectedSignOutNavigation = page.waitForURL(new URL("/api/auth/sign-out", origin).href, {
      waitUntil: "load"
    });
    await page.getByRole("button", { name: "Submit cross-site request", exact: true }).click();
    const rejectedResponse = await rejectedSignOut;
    expect(rejectedResponse.status()).toBe(403);
    const requestCookies = await rejectedResponse.request().headerValue("cookie") ?? "";
    expect(requestCookies.includes(`${cookie!.name}=`), "Cross-site form posts must not send the host session cookie").toBe(false);
    expect((await sessionCookie(context))?.value === cookie!.value, "A rejected cross-site request must preserve the existing session").toBe(true);
    await rejectedSignOutNavigation;
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Good things are on the way.", exact: true })).toBeVisible();
  });
});
