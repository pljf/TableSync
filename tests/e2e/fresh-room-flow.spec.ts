import { expect, test, type Page } from "@playwright/test";
import type { EventType } from "../../src/lib/domain";
import { captureResponsiveEvidence, expectNoAccessibilityViolations } from "./quality-helpers";
import { signInAsHost } from "./host-auth";

const e2eRunMarker = `TableSync E2E ${process.env.TABLESYNC_E2E_RUN_ID ?? "local"}`;
const browserErrors = new WeakMap<Page, string[]>();

async function captureQualityEvidence(page: Page, stateName: string) {
  await expectNoAccessibilityViolations(page, stateName);
  await captureResponsiveEvidence(page, stateName);
}

async function submitMutation(page: Page, path: string, submit: () => Promise<void>) {
  const previousMutationId = new URL(page.url()).searchParams.get("updated");
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().includes(path),
      { timeout: 20_000 }
    ),
    submit()
  ]);
  expect(
    response.status(),
    `Mutation failed with HTTP ${response.status()} at ${response.url()}`
  ).toBeLessThan(400);
  // Wait for the action and subsequent client refresh before asserting saved
  // state. Draft-preservation checks fill other forms before this save.
  await expect.poll(() => new URL(page.url()).searchParams.get("updated"), { timeout: 20_000 }).not.toBe(previousMutationId);
  await page.waitForLoadState("networkidle");
}

async function createRoom(
  page: Page,
  input: { title: string; eventType: EventType; budgetDollars: number },
  captureQuality = false
) {
  await signInAsHost(page);
  if (captureQuality) await captureQualityEvidence(page, "dashboard");
  await page.getByRole("main").getByRole("link", { name: "New room", exact: true }).click();
  await expect(page).toHaveURL(/\/rooms\/new$/);
  await expect(page.getByRole("heading", { name: "Create a room", exact: true })).toBeVisible();
  // The App Router streams the new route's metadata separately from its body.
  // Require the actual title before auditing the completed destination page.
  await expect(page).toHaveTitle("TableSync");
  if (captureQuality) {
    await captureQualityEvidence(page, "new-room-form");
    const dateTimeInput = page.getByLabel("Date and time");
    await page.getByLabel("Title").fill("Recoverable room input");
    await dateTimeInput.evaluate((element) => {
      element.setAttribute("name", "ignoredDateTime");
      const invalidDate = document.createElement("input");
      invalidDate.dataset.e2eInvalidDate = "true";
      invalidDate.name = "dateTime";
      invalidDate.type = "hidden";
      invalidDate.value = "not-a-date";
      element.closest("form")?.append(invalidDate);
    });
    await page.getByRole("button", { name: /create room/i }).click();
    await expect(page.locator(".form-feedback[role='alert']")).toHaveText("Enter a valid date and time");
    await expect(page.getByLabel("Title")).toHaveValue("Recoverable room input");
    const invalidDateInput = page.locator('[data-e2e-invalid-date="true"]');
    if (await invalidDateInput.count()) await invalidDateInput.evaluate((element) => element.remove());
    await dateTimeInput.evaluate((element) => element.setAttribute("name", "dateTime"));
  }
  await page.getByLabel("Title").fill(input.title);
  await page.getByLabel("Description").fill(e2eRunMarker);
  await page.getByLabel("Event type").selectOption(input.eventType);
  await page.getByLabel("Total budget").fill(String(input.budgetDollars));
  await page.getByLabel("Expected guests").fill("2");
  await page.getByLabel("Public share page").check();
  await page.getByRole("button", { name: /create room/i }).click();
  await expect(page.getByRole("heading", { name: input.title })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Share", exact: true })).toHaveCount(0);
  await expect(page.getByText("0 of 2 guests have responded.", { exact: false })).toBeVisible();
  await expect(page.getByText("No diet preferences submitted", { exact: true })).toBeVisible();
  await expect(page.getByText("No spice preferences submitted", { exact: true })).toBeVisible();
  await expect(page.getByText(/no guests have joined yet/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "Room progress", exact: true }).locator('[aria-current="step"]')).toContainText("Preferences");
  const nextStep = page.getByRole("region", { name: "Next step", exact: true });
  await expect(nextStep.locator("a.button:not(.secondary)")).toHaveText("Add my preferences");
  await expect(nextStep.getByRole("link", { name: "Invite guests", exact: true })).toHaveAttribute("href", "#room-invite");
  if (captureQuality) {
    const roomUrl = page.url();
    await page.goto("/dashboard");
    await captureQualityEvidence(page, "dashboard-with-room");
    await page.goto(roomUrl);
    await captureQualityEvidence(page, "room-overview-empty");
    const inviteUrl = await page.getByLabel("Guest invite link").inputValue();
    expect(inviteUrl).toMatch(/^https?:\/\//);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (value: string) => { document.body.dataset.copiedInvite = value; } }
      });
    });
    await page.getByRole("button", { name: "Copy invite link", exact: true }).click();
    await expect(page.locator(".invite-card").getByRole("status")).toHaveText("Invite link copied. Share it with your guests.");
    expect(await page.locator("body").getAttribute("data-copied-invite")).toBe(inviteUrl);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async () => { throw new Error("Clipboard unavailable"); } }
      });
    });
    await page.getByRole("button", { name: "Copy invite link", exact: true }).click();
    await expect(page.locator(".invite-card").getByRole("alert")).toContainText("Select and copy the invite link above");
    await expect(page.getByLabel("Guest invite link")).toBeFocused();
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
    diet: "OMNIVORE" | "VEGETARIAN" | "VEGAN" | "GLUTEN_FREE";
    allergies?: string;
    dislikes?: string;
    likes?: string;
    spice?: "MILD" | "MEDIUM";
    canBring?: boolean;
    notes?: string;
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
  if (guest.notes) await page.getByLabel("Notes", { exact: true }).fill(guest.notes);
  await page.getByRole("button", { name: /join room/i }).click();
  await expect(page.getByRole("heading", { name: "Your preferences", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const editUrl = new URL(page.url());
  return `${editUrl.pathname}${editUrl.search}`;
}

async function generatePlans(page: Page, roomId: string) {
  await page.goto(`/rooms/${roomId}/plans`);
  await expect(page.getByRole("link", { name: "Plans", exact: true })).toHaveAttribute("aria-current", "page");
  await submitMutation(page, `/rooms/${roomId}/plans`, () =>
    page.getByRole("button", { name: /generate plans/i }).click()
  );
  await expect(page.getByText("Voting", { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Voting is open", exact: true })).toBeVisible();
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
  const second = page.locator(`article.plan-card[data-plan-id="${secondPlanId}"]`);
  await second.getByLabel("Veto reason").fill("I prefer the first complete option.");
  await submitMutation(page, `/rooms/${roomId}/plans`, () => first.getByRole("button", { name: /^like$/i }).click());
  await expect(first.getByText("1 likes", { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(first.getByText("Your current vote:", { exact: false })).toContainText("Like");
  await expect(first.getByRole("button", { name: /^like$/i })).toHaveAttribute("aria-pressed", "true");

  await expect(second.getByLabel("Veto reason")).toHaveValue("I prefer the first complete option.");
  await submitMutation(page, `/rooms/${roomId}/plans`, () => second.getByRole("button", { name: /^veto$/i }).click());
  await expect(second.getByText("1 vetoes", { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(second.getByRole("region", { name: "Veto explanations" })).toContainText("I prefer the first complete option.");
  await submitMutation(page, `/rooms/${roomId}/plans`, () => second.getByRole("button", { name: /^like$/i }).click());
  await expect(second.getByLabel("Veto reason")).toHaveValue("");

  const third = page.locator(`article.plan-card[data-plan-id="${thirdPlanId}"]`);
  await submitMutation(page, `/rooms/${roomId}/plans`, () => third.getByRole("button", { name: /^neutral$/i }).click());
  await expect(third.getByText("1 neutral", { exact: true })).toBeVisible({ timeout: 45_000 });

  await submitMutation(page, `/rooms/${roomId}/plans`, () =>
    first.getByRole("button", { name: /finalize plan/i }).click()
  );
  await expect(page.getByText("Finalized", { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("link", { name: "Share", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Prepare this menu", exact: true }).click();
  const preparation = page.getByRole("region", { name: "Prepare this menu", exact: true });
  await expect(preparation).toBeInViewport();
  const recipes = preparation.locator("details");
  await expect(recipes).toHaveCount(await first.locator(".dish-list li").count());
  const firstRecipe = recipes.first();
  await firstRecipe.locator("summary").press("Enter");
  await expect(firstRecipe.getByRole("list")).toBeVisible();
  await expect(firstRecipe).toContainText(/servings? · About \d+ min/);
  await expect(firstRecipe.locator(".dish-list li").first()).toContainText(/\d/);
  if (captureQuality) await captureQualityEvidence(page, "menu-preparation");
  await firstRecipe.locator("summary").press("Enter");
  if (captureQuality) {
    await captureQualityEvidence(page, "finalized-plan");
  }
  const shoppingPath = await page.getByRole("link", { name: /^shopping$/i }).getAttribute("href");
  expect(shoppingPath).toBe(`/rooms/${roomId}/shopping`);
  await page.goto(shoppingPath!, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Shopping workflow", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Shopping", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("group", { name: "Filter shopping items" })).toBeVisible();
  await page.getByRole("button", { name: /^purchased 0$/i }).click();
  await expect(page.getByRole("heading", { name: /no items match this filter/i })).toBeVisible();
  await page.getByRole("button", { name: /^all \d+$/i }).click();
  if (captureQuality) {
    await captureQualityEvidence(page, "shopping-workflow");
  }
  const firstShoppingRow = page.locator("article.shopping-row").first();
  await expect(firstShoppingRow).toBeVisible();
  await firstShoppingRow.getByLabel("Purchased").check();
  const assignmentSelect = firstShoppingRow.getByRole("combobox", { name: /^assign /i });
  const savedAssignee = (await firstShoppingRow.locator(".assignee").innerText()).trim();
  const reassignmentName = savedAssignee === alternateGuestName
    ? (await assignmentSelect.locator("option").allTextContents()).find((name) => name !== "Unassigned" && name !== savedAssignee)
    : alternateGuestName;
  expect(reassignmentName, "The workflow needs a different guest for the reassignment check").toBeTruthy();
  await assignmentSelect.selectOption({ label: reassignmentName! });
  await expect(firstShoppingRow.getByRole("button", { name: /save assignment/i })).toBeEnabled();
  await submitMutation(page, `/rooms/${roomId}/shopping`, () =>
    firstShoppingRow.getByRole("button", { name: /save assignment/i }).click()
  );
  await expect(firstShoppingRow.locator(".assignee")).toHaveText(reassignmentName!, { timeout: 20_000 });
  await expect(firstShoppingRow.getByLabel("Purchased")).toBeChecked();
  await submitMutation(page, `/rooms/${roomId}/shopping`, () =>
    firstShoppingRow.getByRole("button", { name: /^save$/i }).click()
  );
  await expect(page).toHaveURL(new RegExp(`/rooms/${roomId}/shopping\\?updated=`), { timeout: 20_000 });
  await page.waitForLoadState("load");
  await expect(page.locator("article.shopping-row").first().getByLabel("Purchased")).toBeChecked();
  await page.getByRole("button", { name: /^purchased 1$/i }).click();
  await firstShoppingRow.getByRole("combobox", { name: /^assign /i }).selectOption("");
  await submitMutation(page, `/rooms/${roomId}/shopping`, () =>
    firstShoppingRow.getByRole("button", { name: /save assignment/i }).click()
  );
  await expect(page.getByRole("button", { name: /^purchased 1$/i })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator("article.shopping-row").first().getByLabel("Purchased")).toBeChecked();
  await expect(page).toHaveURL(new RegExp(`/rooms/${roomId}/shopping`));
}

async function exercisePotluckContributions(hostPage: Page, guestPage: Page, roomId: string, quality: boolean) {
  await hostPage.goto(`/rooms/${roomId}/shopping`);
  const purchasedIds = await hostPage.locator("article.shopping-row.is-purchased").evaluateAll((rows) =>
    rows.map((row) => row.querySelector<HTMLInputElement>('input[name="itemId"]')?.value).filter((id): id is string => Boolean(id))
  );
  await guestPage.goto(`/rooms/${roomId}/plans`);
  const guestPanel = guestPage.getByRole("region", { name: "Potluck contributions", exact: true });
  await expect(guestPanel).toBeVisible();
  const dishId = await guestPanel.locator("article[data-contribution-dish-id]").first().getAttribute("data-contribution-dish-id");
  expect(dishId).toBeTruthy();
  const first = guestPanel.locator(`article[data-contribution-dish-id="${dishId}"]`);
  await first.getByLabel(/I understand/).check();
  await submitMutation(guestPage, `/rooms/${roomId}/plans`, () => first.getByRole("button", { name: /claim|bring this dish/i }).click());
  await expect(first.getByLabel("Ready to bring", { exact: true })).toBeVisible();
  await first.getByLabel("Ready to bring", { exact: true }).check();
  await submitMutation(guestPage, `/rooms/${roomId}/plans`, () => first.getByRole("button", { name: "Save readiness", exact: true }).click());
  await guestPage.reload();
  await expect(first.getByLabel("Ready to bring", { exact: true })).toBeChecked();
  if (quality) await captureQualityEvidence(guestPage, "potluck-guest-contribution-ready");

  await hostPage.goto(`/rooms/${roomId}/shopping`);
  for (const id of purchasedIds) {
    const retainedRow = hostPage.locator("article.shopping-row").filter({ has: hostPage.locator(`input[name="itemId"][value="${id}"]`) });
    if (await retainedRow.count()) await expect(retainedRow.getByLabel("Purchased", { exact: true })).toBeChecked();
  }
  await hostPage.goto(`/rooms/${roomId}/plans`);
  const panel = hostPage.getByRole("region", { name: "Potluck contributions", exact: true });
  const hostFirst = panel.locator(`article[data-contribution-dish-id="${dishId}"]`);
  await expect(hostFirst.getByLabel("Ready to bring", { exact: true })).toBeChecked();
  await hostFirst.getByRole("combobox", { name: "Assign contribution", exact: true }).selectOption({ label: "Potluck Omnivore" });
  await hostFirst.getByLabel("Ready to bring", { exact: true }).uncheck();
  await submitMutation(hostPage, `/rooms/${roomId}/plans`, () => hostFirst.getByRole("button", { name: "Save readiness", exact: true }).click());
  await expect(hostFirst.getByRole("combobox", { name: "Assign contribution", exact: true }).locator("option:checked")).toHaveText("Potluck Omnivore");
  await expect(hostFirst.getByLabel("Ready to bring", { exact: true })).not.toBeChecked();

  // Host assigns remaining whole dishes. Shared shopping reaches a valid empty state.
  const ids = await panel.locator("article[data-contribution-dish-id]").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-contribution-dish-id")!)
  );
  for (const id of ids.filter((id) => id !== dishId)) {
    const row = panel.locator(`article[data-contribution-dish-id="${id}"]`);
    await row.getByRole("combobox", { name: "Assign contribution", exact: true }).selectOption({ label: "Potluck Omnivore" });
    const confirmation = row.getByLabel(/I understand/);
    if (await confirmation.count()) await confirmation.check();
    await submitMutation(hostPage, `/rooms/${roomId}/plans`, () => row.getByRole("button", { name: "Save contribution", exact: true }).click());
  }
  await hostPage.goto(`/rooms/${roomId}/shopping`);
  await expect(hostPage.locator("article.shopping-row")).toHaveCount(0);
  await expect(hostPage.getByText(/every dish|all dishes/i).first()).toBeVisible();
  if (quality) await captureQualityEvidence(hostPage, "potluck-all-contributed-shopping");

  // Releasing restores this recipe's grocery quantities and clears only its readiness.
  await guestPage.reload();
  const releaseConfirmation = first.getByLabel(/I understand/);
  if (await releaseConfirmation.count()) await releaseConfirmation.check();
  await submitMutation(guestPage, `/rooms/${roomId}/plans`, () => first.getByRole("button", { name: /release|return.*shopping/i }).click());
  await expect(first.getByLabel("Ready to bring", { exact: true })).toHaveCount(0);
  await hostPage.goto(`/rooms/${roomId}/shopping`);
  await expect(hostPage.locator("article.shopping-row").first()).toBeVisible();
}

test.describe("fresh-room core workflows", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(20_000);
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

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`room tabs respond during slow navigation with motion set to ${reducedMotion}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width: 375, height: 812 });
      const { roomId } = await createRoom(page, {
        title: "Room navigation feedback",
        eventType: "DINNER",
        budgetDollars: 120
      });

      for (const destination of [
        { label: "Plans", suffix: "plans", heading: "No menu plans yet" },
        { label: "Shopping", suffix: "shopping", heading: "No shopping list yet" }
      ]) {
        const path = `/rooms/${roomId}/${destination.suffix}`;
        let releaseRequest!: () => void;
        const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve; });
        const matchesPath = (url: URL) => url.pathname === path;
        await page.route(matchesPath, async (route) => {
          await requestGate;
          await route.continue();
        });

        try {
          const navigation = page.getByRole("navigation", { name: "Room sections" });
          const link = navigation.getByRole("link", { name: destination.label, exact: true });
          const idleWidth = await link.evaluate((element) => (element as HTMLElement).offsetWidth);
          if (destination.label === "Plans") await link.click();
          else await link.press("Enter");

          await expect(link.getByRole("status")).toHaveText(`Opening ${destination.label}…`);
          await expect(navigation.locator('[data-pending="true"]')).toHaveCount(1);
          await expect(link.locator(".button-spinner")).toBeVisible();
          await expect(link).not.toHaveAttribute("aria-current", "page");
          // Measure layout, independent of the temporary pressed transform.
          const pendingWidth = await link.evaluate((element) => (element as HTMLElement).offsetWidth);
          expect(pendingWidth).toBe(idleWidth);
          const animationName = await link.locator(".button-spinner").evaluate((element) => getComputedStyle(element).animationName);
          if (reducedMotion === "reduce") expect(animationName).toBe("none");
          else expect(animationName).not.toBe("none");

          releaseRequest();
          await expect(page).toHaveURL(new RegExp(`${path}$`));
          await expect(page.getByRole("heading", { name: destination.heading, exact: true })).toBeVisible();
          await expect(page.getByRole("region", { name: "Room progress", exact: true }).locator('[aria-current="step"]')).toContainText("Preferences");
          await expect(page.getByRole("link", { name: "Add my preferences", exact: true })).toBeVisible();
          await expect(link).toHaveAttribute("aria-current", "page");
          await expect(navigation.locator('[data-pending="true"]')).toHaveCount(0);
          await expect(link.getByRole("status")).toBeEmpty();
        } finally {
          releaseRequest();
          await page.unroute(matchesPath);
        }
      }
    });
  }

  test("Dinner completes creation, preferences, strict planning, voting, shopping, and destructive recovery", async ({
    page
  }, testInfo) => {
    const captureQuality = testInfo.project.name === "chromium";
    const { roomId, invitePath } = await createRoom(page, {
      title: "Fresh Dinner Acceptance",
      eventType: "DINNER",
      budgetDollars: 120
    }, captureQuality);
    await page.goto(`/rooms/${roomId}/shopping`);
    await expect(page.getByText("Waiting for a menu", { exact: true })).toBeVisible();
    await expect(page.getByText("Your shopping list appears automatically after the host finalizes a menu.", { exact: true })).toBeVisible();
    await expect(page.getByText("Total estimate", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /no shopping list yet/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Share", exact: true })).toHaveCount(0);
    const vegetarianEditPath = await joinGuest(page, invitePath, {
      name: "Dinner Vegetarian",
      diet: "VEGETARIAN",
      likes: "tofu, rice",
      canBring: true,
      notes: "Please keep a separate serving aside."
    }, captureQuality);
    await page.getByLabel("Liked ingredients", { exact: true }).fill("tofu, rice, mushrooms");
    await page.getByRole("button", { name: /save preferences/i }).click();
    await expect(page).toHaveURL(/\/preferences\?.*updated=/, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("status")).toContainText("Preferences saved");
    await page.getByRole("link", { name: "View room overview", exact: true }).click();
    await page.getByRole("link", { name: "My preferences", exact: true }).click();
    await expect(page.getByLabel("Liked ingredients", { exact: true })).toHaveValue("tofu, rice, mushrooms");
    await page.goto(invitePath);
    await expect(page.getByRole("link", { name: "Edit your saved preferences", exact: true })).toBeVisible();
    await joinGuest(page, invitePath, {
      name: "Dinner Allergy Guest",
      diet: "OMNIVORE",
      allergies: "peanut",
      dislikes: "mushrooms",
      spice: "MILD"
    });
    if (captureQuality) {
      await page.goto(`/rooms/${roomId}`);
      await page.getByText("Food preferences for Dinner Vegetarian", { exact: true }).click();
      await expect(page.getByText("Please keep a separate serving aside.", { exact: false })).toBeVisible();
      await captureQualityEvidence(page, "room-overview-constraints");
    }
    await generatePlans(page, roomId);
    if (captureQuality) {
      await captureQualityEvidence(page, "dinner-voting");
    }
    await page.goto(vegetarianEditPath);
    await expect(page.getByRole("heading", { name: /your preferences are saved/i })).toBeVisible();
    await expect(page.getByText(/can no longer be changed/i)).toBeVisible();

    // A streamed voting form must not accept drafts before its controlled
    // handlers hydrate. Inspect the server markup without executing its scripts.
    const votingResponse = await page.request.get(`/rooms/${roomId}/plans`);
    expect(votingResponse.status()).toBe(200);
    const serverVoteControls = await page.evaluate((html) => {
      const document = new DOMParser().parseFromString(html, "text/html");
      return Array.from(document.querySelectorAll("form.vote-form"), (form) => ({
        reasonDisabled: form.querySelector<HTMLInputElement>('input[name="reason"]')?.disabled,
        submitDisabled: Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"]'), (button) => button.disabled)
      }));
    }, await votingResponse.text());
    expect(serverVoteControls).toHaveLength(3);
    for (const controls of serverVoteControls) {
      expect(controls.reasonDisabled).toBe(true);
      expect(controls.submitDisabled).toEqual([true, true, true]);
    }

    await page.goto(`/rooms/${roomId}/plans`);

    for (const card of await page.locator("article.plan-card").all()) {
      await expect(card.getByLabel("Veto reason")).toBeEnabled();
      await expect(card.getByRole("button", { name: /^like$/i })).toBeEnabled();
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

  for (const format of [
    { type: "POTLUCK", label: "Potluck", mains: 2, sides: 2, desserts: 1, sauces: 0, appetizers: 0, note: "Bring each claimed dish in its planned quantity and mark it ready when prepared." },
    { type: "BBQ", label: "BBQ", mains: 2, sides: 2, desserts: 0, sauces: 1, appetizers: 0, note: "Use separate utensils and cooking areas for plant-based mains and meat." },
    { type: "PICNIC", label: "Picnic", mains: 0, sides: 2, desserts: 1, sauces: 0, appetizers: 0, note: "Keep perishable dishes chilled during transport and until serving." },
    { type: "BRUNCH", label: "Brunch", mains: 0, sides: 2, desserts: 0, sauces: 0, appetizers: 0, note: "Serve the savory dishes together with the fruit side for a complete brunch." },
    { type: "OTHER", label: "Other", mains: 0, sides: 1, desserts: 0, sauces: 0, appetizers: 1, note: "Arrange the mains, side, and appetizer as a shared buffet with separate serving utensils." }
  ] as const) {
    test(`${format.label} completes a fresh-room workflow, budget recovery, sharing, and reopening`, async ({ page, browser }, testInfo) => {
      test.setTimeout(240_000);
      const quality = testInfo.project.name === "chromium";
      const { roomId, invitePath } = await createRoom(page, {
        title: `Fresh ${format.label} Acceptance`, eventType: format.type, budgetDollars: 1
      });
      // A separate guest browser proves contribution self-service without host authority.
      const guestContext = await browser.newContext({ baseURL: process.env.TABLESYNC_E2E_BASE_URL ?? "http://localhost:3000" });
      const guestPage = await guestContext.newPage();
      guestPage.setDefaultTimeout(20_000);
      const guestErrors: string[] = [];
      guestPage.on("pageerror", (error) => guestErrors.push(error.message));
      guestPage.on("console", (message) => { if (message.type() === "error") guestErrors.push(message.text()); });
      try {
        await joinGuest(guestPage, invitePath, {
          name: `${format.label} Vegan`, diet: "VEGAN", allergies: "peanut", spice: "MILD", canBring: true
        });
        await joinGuest(page, invitePath, {
          name: `${format.label} Omnivore`, diet: "OMNIVORE", dislikes: "mushrooms", spice: "MILD", canBring: true
        });
        await page.goto(`/rooms/${roomId}/plans`);
        await page.getByRole("button", { name: /generate plans/i }).click();
        await expect(page.getByRole("heading", { name: /no safe plan is ready yet/i })).toBeVisible();
        await expect(page.locator("article.plan-card")).toHaveCount(0);
        await expect(page.getByText(`No accepted ${format.label} plan`, { exact: false })).toBeVisible();
        await page.reload();
        await expect(page.getByRole("heading", { name: /no safe plan is ready yet/i })).toBeVisible();
        if (quality) await captureQualityEvidence(page, `${format.type.toLowerCase()}-no-solution`);
        await page.getByRole("link", { name: "Edit room details or budget", exact: true }).click();
        await expect(page.getByLabel("Event type")).toHaveValue(format.type);
        if (quality) await captureQualityEvidence(page, `${format.type.toLowerCase()}-edit-room`);
        await page.getByLabel("Total budget", { exact: true }).fill("240");
        await page.getByRole("button", { name: "Save room details", exact: true }).click();
        await expect(page.getByRole("heading", { name: `Fresh ${format.label} Acceptance`, exact: true })).toBeVisible();
        await generatePlans(page, roomId);
        await expect(page.getByText(format.note, { exact: true })).toBeVisible();
        for (const card of await page.locator("article.plan-card").all()) {
          const mainCount = await card.getByText(/^(Shared|Grill|Portable|Brunch|Buffet) main -/).count();
          if (format.mains) expect(mainCount).toBe(format.mains);
          else { expect(mainCount).toBeGreaterThanOrEqual(1); expect(mainCount).toBeLessThanOrEqual(2); }
          await expect(card.getByText(/^(Side|Portable side) -/)).toHaveCount(format.sides);
          await expect(card.getByText(/^Dessert -/)).toHaveCount(format.desserts);
          await expect(card.getByText(/^(Sauce|Accompaniment) -/)).toHaveCount(format.sauces);
          await expect(card.getByText(/^Appetizer -/)).toHaveCount(format.appetizers);
          await expect(card.getByText(/^Drink -/)).toHaveCount(1);
        }
        if (quality) await captureQualityEvidence(page, `${format.type.toLowerCase()}-voting`);
        await voteFinalizeAndShop(page, roomId, `${format.label} Omnivore`);
        if (quality) await captureQualityEvidence(page, `${format.type.toLowerCase()}-shopping`);

        if (format.type === "POTLUCK") {
          await exercisePotluckContributions(page, guestPage, roomId, quality);
        }

        await page.goto(`/rooms/${roomId}/plans`);
        const finalNames = await page.locator("article.plan-card.selected .dish-list li > span").allTextContents();
        const finalRolesAndServings = (await page.locator("article.plan-card.selected .dish-list li > small").allTextContents()).map((text) => text.trim());
        expect(finalNames.length).toBeGreaterThanOrEqual(4);
        await guestPage.goto(`/share/${roomId}`);
        await expect(guestPage.getByRole("heading", { name: `Fresh ${format.label} Acceptance`, exact: true })).toBeVisible();
        for (const name of finalNames) await expect(guestPage.getByText(name, { exact: true })).toBeVisible();
        await expect(guestPage.locator(".dish-list li > small")).toHaveText(finalRolesAndServings);
        await expect(guestPage.getByText(format.note, { exact: true })).toBeVisible();
        await expect(guestPage.getByText(`${format.label} Vegan`, { exact: true })).toHaveCount(0);
        await expect(guestPage.getByText(`${format.label} Omnivore`, { exact: true })).toHaveCount(0);
        if (quality) await captureQualityEvidence(guestPage, `${format.type.toLowerCase()}-share`);
        await page.getByText("Undo finalization", { exact: true }).click();
        await page.getByLabel(/I understand that all shopping progress/).check();
        await page.getByRole("button", { name: /undo and delete shopping progress/i }).click();
        await expect(page.getByText("Voting", { exact: true })).toBeVisible();
        await expect(page.getByRole("region", { name: "Potluck contributions", exact: true })).toHaveCount(0);
        await page.getByText("Reopen guest preferences", { exact: true }).click();
        await page.getByLabel("I understand that all current plans and votes will be deleted.").check();
        await page.getByRole("button", { name: /reopen and delete derived work/i }).click();
        await expect(page.getByText("Collecting Preferences", { exact: true })).toBeVisible();
        await expect(page.locator("article.plan-card")).toHaveCount(0);
        await page.goto(`/rooms/${roomId}/shopping`);
        await expect(page.getByRole("heading", { name: /no shopping list yet/i })).toBeVisible();
        expect(guestErrors, "Guest browser errors").toEqual([]);
      } finally {
        await guestContext.close();
      }
    });
  }

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
    await expect(page.getByRole("region", { name: "Room progress", exact: true }).locator('[aria-current="step"]')).toContainText("Menu & voting");
    await expect(page.getByRole("link", { name: "Review generation report", exact: true })).toHaveAttribute("href", "#generation-report");
    await expect(page.getByText(/reference only · not votable/i)).toBeVisible();
    await expect(page.locator("article.plan-card")).toHaveCount(0);
    if (testInfo.project.name === "chromium") {
      await captureQualityEvidence(page, "no-solution");
    }
    await page.reload();
    await expect(page.getByRole("heading", { name: /no safe plan is ready yet/i })).toBeVisible();
    await expect(page.getByText("Planning", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Edit room details or budget", exact: true }).click();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Fresh No Solution Acceptance");
    await expect(page.getByLabel("Total budget", { exact: true })).toHaveValue("1");
    if (testInfo.project.name === "chromium") {
      await captureQualityEvidence(page, "edit-room");
    }
    await page.getByLabel("Total budget", { exact: true }).fill("120");
    await page.getByLabel("Date and time", { exact: true }).fill("2026-12-11T19:30");
    await page.getByRole("button", { name: "Save room details", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Fresh No Solution Acceptance", exact: true })).toBeVisible();
    await expect(page.getByText("Budget Constrained Guest", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Edit room", exact: true }).click();
    await expect(page.getByLabel("Date and time", { exact: true })).toHaveValue("2026-12-11T19:30");
    await expect(page.getByLabel("Total budget", { exact: true })).toHaveValue("120");
    await generatePlans(page, roomId);
    await expect(page.getByRole("heading", { name: /no safe plan is ready yet/i })).toHaveCount(0);
    await page.goto(`/rooms/${roomId}/edit`);
    await expect(page.getByRole("heading", { name: "Room details are locked", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save room details", exact: true })).toHaveCount(0);
  });
});
