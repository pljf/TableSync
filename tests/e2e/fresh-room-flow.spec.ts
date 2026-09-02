import { expect, test, type Page } from "@playwright/test";
import { captureResponsiveEvidence, expectNoAccessibilityViolations } from "./quality-helpers";

const e2eRunMarker = `TableSync E2E ${process.env.TABLESYNC_E2E_RUN_ID ?? "local"}`;
const browserErrors = new WeakMap<Page, string[]>();

async function captureQualityEvidence(page: Page, stateName: string) {
  await expectNoAccessibilityViolations(page, stateName);
  await captureResponsiveEvidence(page, stateName);
}

async function submitMutation(page: Page, path: string, submit: () => Promise<void>) {
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes(path)
  );
  await submit();
  const response = await responsePromise;
  expect(
    response.status(),
    `Mutation failed with HTTP ${response.status()} at ${response.url()}`
  ).toBeLessThan(400);
}

async function signIn(page: Page) {
  const origin = process.env.TABLESYNC_E2E_BASE_URL ?? "http://localhost:3000";
  if (process.env.TABLESYNC_E2E_MODE === "remote") {
    const value = process.env.TABLESYNC_STAGING_SESSION_COOKIE;
    const name = process.env.TABLESYNC_STAGING_SESSION_COOKIE_NAME ?? "tablesync-auth.session_token";
    if (!value) {
      throw new Error("TABLESYNC_STAGING_SESSION_COOKIE is required for remote acceptance.");
    }
    await page.context().addCookies([
      { name, value, url: origin, httpOnly: true, sameSite: "Lax", secure: true }
    ]);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /your dinner rooms/i })).toBeVisible();
    return;
  }

  const key = process.env.TABLESYNC_E2E_AUTH_KEY;
  if (!key) {
    throw new Error("TABLESYNC_E2E_AUTH_KEY is required for the isolated local test identity.");
  }
  const response = await page.request.post("/api/test/auth/session", {
    headers: { Origin: origin, "x-tablesync-e2e-key": key }
  });
  expect(response.status()).toBe(200);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /your dinner rooms/i })).toBeVisible();
}

async function createRoom(
  page: Page,
  input: { title: string; eventType: "DINNER" | "HOTPOT"; budgetDollars: number },
  captureQuality = false
) {
  await signIn(page);
  await page.getByRole("main").getByRole("link", { name: "New room", exact: true }).click();
  if (captureQuality) {
    await captureQualityEvidence(page, "new-room-form");
  }
  await page.getByLabel("Title").fill(input.title);
  await page.getByLabel("Description").fill(e2eRunMarker);
  await page.getByLabel("Event type").selectOption(input.eventType);
  await page.getByLabel("Total budget").fill(String(input.budgetDollars));
  await page.getByLabel("Expected guests").fill("2");
  await page.getByLabel("Public share page").check();
  await page.getByRole("button", { name: /create room/i }).click();
  await expect(page.getByRole("heading", { name: input.title })).toBeVisible();
  if (captureQuality) {
    await captureQualityEvidence(page, "room-overview-empty");
  }

  const match = page.url().match(/\/rooms\/([^/?#]+)/);
  if (!match) {
    throw new Error(`Could not read room id from ${page.url()}`);
  }
  const roomId = match[1];
  const invitePath = await page.getByRole("link", { name: /open guest form/i }).getAttribute("href");
  if (!invitePath) {
    throw new Error("Room did not expose a guest invite path.");
  }
  return { roomId, invitePath };
}

async function joinGuest(
  page: Page,
  invitePath: string,
  guest: {
    name: string;
    diet: "OMNIVORE" | "VEGETARIAN" | "GLUTEN_FREE";
    allergies?: string;
    dislikes?: string;
    likes?: string;
    spice?: "MILD" | "MEDIUM";
    canBring?: boolean;
  },
  captureQuality = false
) {
  await page.goto(invitePath);
  if (captureQuality) {
    await captureQualityEvidence(page, "guest-join-form");
  }
  await page.getByLabel("Name").fill(guest.name);
  await page.getByLabel("Diet type").selectOption(guest.diet);
  await page.getByLabel("Spice tolerance").selectOption(guest.spice ?? "MEDIUM");
  if (guest.allergies) {
    await page.getByLabel("Allergies").fill(guest.allergies);
  }
  if (guest.dislikes) {
    await page.getByLabel("Disliked ingredients").fill(guest.dislikes);
  }
  if (guest.likes) {
    await page.getByLabel("Liked ingredients", { exact: true }).fill(guest.likes);
  }
  if (guest.canBring) {
    await page.getByLabel("I can bring groceries or food").check();
  }
  await page.getByRole("button", { name: /join room/i }).click();
  await expect(page.getByRole("heading", { name: "Your preferences", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const editUrl = new URL(page.url());
  return `${editUrl.pathname}${editUrl.search}`;
}

async function generatePlans(page: Page, roomId: string) {
  await page.goto(`/rooms/${roomId}/plans`);
  await submitMutation(page, `/rooms/${roomId}/plans`, () =>
    page.getByRole("button", { name: /generate plans/i }).click()
  );
  await expect(page.getByText("Voting", { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("article.plan-card")).toHaveCount(3);
}

async function voteFinalizeAndShop(
  page: Page,
  roomId: string,
  alternateGuestName: string,
  captureQuality = false
) {
  const cards = page.locator("article.plan-card");
  const firstPlanId = await cards.first().getAttribute("data-plan-id");
  const secondPlanId = await cards.nth(1).getAttribute("data-plan-id");
  const thirdPlanId = await cards.nth(2).getAttribute("data-plan-id");
  if (!firstPlanId || !secondPlanId || !thirdPlanId) {
    throw new Error("Generated plan cards are missing stable identifiers.");
  }
  const first = page.locator(`article.plan-card[data-plan-id="${firstPlanId}"]`);
  await submitMutation(page, `/rooms/${roomId}/plans`, () => first.getByRole("button", { name: /^like$/i }).click());
  await expect(first.getByText("1 likes", { exact: true })).toBeVisible({ timeout: 45_000 });

  const second = page.locator(`article.plan-card[data-plan-id="${secondPlanId}"]`);
  await second.getByLabel("Veto reason").fill("I prefer the first complete option.");
  await submitMutation(page, `/rooms/${roomId}/plans`, () => second.getByRole("button", { name: /^veto$/i }).click());
  await expect(second.getByText("1 vetoes", { exact: true })).toBeVisible({ timeout: 45_000 });

  const third = page.locator(`article.plan-card[data-plan-id="${thirdPlanId}"]`);
  await submitMutation(page, `/rooms/${roomId}/plans`, () => third.getByRole("button", { name: /^neutral$/i }).click());
  await expect(third.getByText("1 neutral", { exact: true })).toBeVisible({ timeout: 45_000 });

  await submitMutation(page, `/rooms/${roomId}/plans`, () =>
    first.getByRole("button", { name: /finalize plan/i }).click()
  );
  await expect(page.getByText("Finalized", { exact: true })).toBeVisible({ timeout: 45_000 });
  if (captureQuality) {
    await captureQualityEvidence(page, "finalized-plan");
  }
  const shoppingPath = await page.getByRole("link", { name: /^shopping$/i }).getAttribute("href");
  expect(shoppingPath).toBe(`/rooms/${roomId}/shopping`);
  await page.goto(shoppingPath!, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Shopping workflow", { exact: true })).toBeVisible({ timeout: 15_000 });
  if (captureQuality) {
    await captureQualityEvidence(page, "shopping-workflow");
  }
  const firstShoppingRow = page.locator("article.shopping-row").first();
  await expect(firstShoppingRow).toBeVisible();
  await firstShoppingRow.getByRole("combobox", { name: /^assign /i }).selectOption({ label: alternateGuestName });
  await submitMutation(page, `/rooms/${roomId}/shopping`, () =>
    firstShoppingRow.getByRole("button", { name: /save assignment/i }).click()
  );
  await expect(firstShoppingRow.locator(".assignee")).toHaveText(alternateGuestName, { timeout: 20_000 });
  await firstShoppingRow.getByLabel("Purchased").check();
  await submitMutation(page, `/rooms/${roomId}/shopping`, () =>
    firstShoppingRow.getByRole("button", { name: /^save$/i }).click()
  );
  await expect(page).toHaveURL(new RegExp(`/rooms/${roomId}/shopping\\?updated=`), { timeout: 20_000 });
  await page.waitForLoadState("load");
  await expect(page.locator("article.shopping-row").first().getByLabel("Purchased")).toBeChecked();
  await page.reload();
  await expect(page.locator("article.shopping-row").first().getByLabel("Purchased")).toBeChecked();
  await expect(page).toHaveURL(new RegExp(`/rooms/${roomId}/shopping`));
}

test.describe("fresh-room core workflows", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    browserErrors.set(page, errors);
    page.on("console", (message) => {
      if (message.type() === "error") {
        const location = message.location();
        const source = location.url
          ? ` at ${location.url}:${location.lineNumber}:${location.columnNumber}`
          : "";
        errors.push(`console: ${message.text()}${source} while viewing ${page.url()}`);
      }
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  });

  test.afterEach(async ({ page }) => {
    expect(browserErrors.get(page) ?? [], "Unexpected browser errors occurred during the acceptance flow").toEqual([]);
  });

  test("Dinner completes creation, preferences, strict planning, voting, shopping, and destructive recovery", async ({
    page
  }, testInfo) => {
    const captureQuality = testInfo.project.name === "chromium";
    const { roomId, invitePath } = await createRoom(page, {
      title: "Fresh Dinner Acceptance",
      eventType: "DINNER",
      budgetDollars: 120
    }, captureQuality);
    const vegetarianEditPath = await joinGuest(page, invitePath, {
      name: "Dinner Vegetarian",
      diet: "VEGETARIAN",
      likes: "tofu, rice",
      canBring: true
    }, captureQuality);
    await page.getByLabel("Liked ingredients", { exact: true }).fill("tofu, rice, mushrooms");
    await page.getByRole("button", { name: /save preferences/i }).click();
    await expect(page).toHaveURL(/\/preferences\?.*updated=/, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("status")).toContainText("Preferences saved");
    await joinGuest(page, invitePath, {
      name: "Dinner Allergy Guest",
      diet: "OMNIVORE",
      allergies: "peanut",
      dislikes: "mushrooms",
      spice: "MILD"
    });
    if (captureQuality) {
      await page.goto(`/rooms/${roomId}`);
      await captureQualityEvidence(page, "room-overview-constraints");
    }
    await generatePlans(page, roomId);
    if (captureQuality) {
      await captureQualityEvidence(page, "dinner-voting");
    }
    await page.goto(vegetarianEditPath);
    await expect(page.getByRole("heading", { name: /your preferences are saved/i })).toBeVisible();
    await expect(page.getByText(/can no longer be changed/i)).toBeVisible();
    await page.goto(`/rooms/${roomId}/plans`);

    for (const card of await page.locator("article.plan-card").all()) {
      expect(await card.getByText(/^Main -/).count()).toBeGreaterThanOrEqual(1);
      await expect(card.getByText(/^Side -/)).toHaveCount(2);
      await expect(card.getByText(/^Drink -/)).toHaveCount(1);
    }

    await voteFinalizeAndShop(page, roomId, "Dinner Allergy Guest", captureQuality);
    await page.goto(`/rooms/${roomId}/plans`);
    await page.getByText("Undo finalization").click();
    if (captureQuality) {
      await captureQualityEvidence(page, "undo-finalization-confirmation");
    }
    await page.getByLabel("I understand that all shopping progress will be deleted.").check();
    await page.getByRole("button", { name: /undo and delete shopping progress/i }).click();
    await expect(page.getByText("Voting", { exact: true })).toBeVisible();

    await page.getByText("Reopen guest preferences").click();
    if (captureQuality) {
      await captureQualityEvidence(page, "reopen-preferences-confirmation");
    }
    await page.getByLabel("I understand that all current plans and votes will be deleted.").check();
    await page.getByRole("button", { name: /reopen and delete derived work/i }).click();
    await expect(page.getByText("Collecting Preferences", { exact: true })).toBeVisible();
    await expect(page.locator("article.plan-card")).toHaveCount(0);
  });

  test("Hotpot completes the fresh-room workflow with safe broth and exact event roles", async ({ page }, testInfo) => {
    const captureQuality = testInfo.project.name === "chromium";
    const { roomId, invitePath } = await createRoom(page, {
      title: "Fresh Hotpot Acceptance",
      eventType: "HOTPOT",
      budgetDollars: 120
    });
    await joinGuest(page, invitePath, {
      name: "Hotpot Vegetarian",
      diet: "VEGETARIAN",
      likes: "tofu, mushrooms",
      canBring: true
    });
    await joinGuest(page, invitePath, {
      name: "Hotpot Omnivore",
      diet: "OMNIVORE",
      allergies: "peanut",
      spice: "MILD"
    });
    await generatePlans(page, roomId);
    if (captureQuality) {
      await captureQualityEvidence(page, "hotpot-voting");
    }

    for (const card of await page.locator("article.plan-card").all()) {
      await expect(card.getByText(/^Broth -/)).toHaveCount(1);
      await expect(card.getByText(/^Protein -/)).toHaveCount(2);
      await expect(card.getByText(/^Vegetable -/)).toHaveCount(2);
      await expect(card.getByText(/^Staple -/)).toHaveCount(1);
      await expect(card.getByText(/^Sauce -/)).toHaveCount(2);
      await expect(card.getByText(/^Drink -/)).toHaveCount(1);
    }

    await voteFinalizeAndShop(page, roomId, "Hotpot Omnivore");
    await page.goto(`/rooms/${roomId}/plans`);
    await expect(page.getByText("Finalized", { exact: true })).toBeVisible();
  });

  test("a fresh room renders a persisted no-solution report without votable cards", async ({ page }, testInfo) => {
    const { roomId, invitePath } = await createRoom(page, {
      title: "Fresh No Solution Acceptance",
      eventType: "DINNER",
      budgetDollars: 1
    });
    await joinGuest(page, invitePath, {
      name: "Budget Constrained Guest",
      diet: "OMNIVORE",
      canBring: true
    });
    await page.goto(`/rooms/${roomId}/plans`);
    await page.getByRole("button", { name: /generate plans/i }).click();

    await expect(page.getByRole("heading", { name: /no safe plan is ready yet/i })).toBeVisible();
    await expect(page.getByText(/reference only · not votable/i)).toBeVisible();
    await expect(page.locator("article.plan-card")).toHaveCount(0);
    if (testInfo.project.name === "chromium") {
      await captureQualityEvidence(page, "no-solution");
    }
    await page.reload();
    await expect(page.getByRole("heading", { name: /no safe plan is ready yet/i })).toBeVisible();
    await expect(page.getByText("Planning", { exact: true })).toBeVisible();
  });
});
