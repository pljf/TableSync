import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { captureResponsiveEvidence, expectNoAccessibilityViolations } from "./quality-helpers";
import { signInAsHost } from "./host-auth";
import { fillGuestPreferences, type GuestPreferences } from "./guest-preferences";

const origin = process.env.TABLESYNC_E2E_BASE_URL ?? "http://localhost:3000";
const marker = `TableSync E2E ${process.env.TABLESYNC_E2E_RUN_ID ?? "local"}`;

async function createMeal(page: Page, title: string, creator: GuestPreferences = { name: "Meal creator", diet: "OMNIVORE" }) {
  await page.goto("/rooms/new");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Description", { exact: true }).fill(marker);
  await page.getByLabel("Expected guests", { exact: true }).fill("2");
  await page.getByLabel("Total budget", { exact: true }).fill("150");
  await fillGuestPreferences(page, creator);
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  const roomId = new URL(page.url()).pathname.split("/").at(-1)!;
  const invitation = await page.getByLabel("Guest invite link").inputValue();
  return { roomId, invitation, title };
}

async function joinMeal(page: Page, invitation: string, name: string, notes: string) {
  await page.goto(invitation);
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("textbox", { name: "Notes", exact: true }).fill(notes);
  await page.getByLabel("I can bring groceries or food", { exact: true }).check();
  await page.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your preferences", exact: true })).toBeVisible();
}

async function save(page: Page, click: () => Promise<void>) {
  const before = new URL(page.url()).searchParams.get("updated");
  await click();
  await expect.poll(() => new URL(page.url()).searchParams.get("updated"), { timeout: 20_000 }).not.toBe(before);
  await expect(page.locator('form[data-state="pending"]')).toHaveCount(0);
}

test.describe("collaboration reliability", () => {
  test.setTimeout(120_000);

  test("retains independent responses for multiple rooms in one browser", async ({ browser, page }) => {
    await signInAsHost(page);
    const first = await createMeal(page, `First meal ${randomUUID()}`, {
      name: "First-room creator", diet: "VEGAN", allergies: "peanut", notes: "First creator note"
    });
    const second = await createMeal(page, `Second meal ${randomUUID()}`, {
      name: "Second-room creator", diet: "VEGETARIAN", allergies: "sesame", notes: "Second creator note"
    });
    // Creating another room must retain the creator's existing room response.
    for (const room of [first, second]) {
      await page.goto(`/rooms/${room.roomId}`);
      await expect(page.locator(".guest-row")).toHaveCount(1);
      await expect(page.locator(".guest-row")).toContainText(room === first ? "First-room creator" : "Second-room creator");
      await page.getByRole("link", { name: "My preferences", exact: true }).click();
      await expect(page.getByRole("navigation", { name: "Your meal responses", exact: true }).getByRole("link")).toHaveCount(2);
      await expect(page.getByLabel("Name", { exact: true })).toHaveValue(room === first ? "First-room creator" : "Second-room creator");
      await expect(page.getByRole("combobox", { name: "Diet type", exact: true })).toHaveValue(room === first ? "VEGAN" : "VEGETARIAN");
      await expect(page.getByLabel("Allergies", { exact: true })).toHaveValue(room === first ? "peanut" : "sesame");
      await expect(page.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue(room === first ? "First creator note" : "Second creator note");
    }
    const guestContext = await browser.newContext({ baseURL: origin });
    try {
      const guest = await guestContext.newPage();
      await joinMeal(guest, first.invitation, "First-room diner", "First room note");
      await joinMeal(guest, second.invitation, "Second-room diner", "Second room note");
      await expect(guest.getByRole("navigation", { name: "Your meal responses", exact: true }).getByRole("link")).toHaveCount(2);
      for (const room of [first, second]) {
        await guest.goto(`/rooms/${room.roomId}`);
        await expect(guest.getByRole("heading", { name: room.title, exact: true })).toBeVisible();
        await guest.getByRole("link", { name: "My preferences", exact: true }).click();
        await expect(guest).toHaveURL(new RegExp(`roomId=${room.roomId}`));
        await expect(guest.getByRole("heading", { name: "Your preferences", exact: true })).toBeVisible({ timeout: 20_000 });
        await expect(guest.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue(room === first ? "First room note" : "Second room note", { timeout: 20_000 });
      }
      await guest.goto(`/preferences?roomId=${first.roomId}`);
      await guest.getByRole("textbox", { name: "Notes", exact: true }).fill("Updated first room only");
      await expect(guest.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue("Updated first room only");
      await save(guest, () => guest.getByRole("button", { name: "Save preferences", exact: true }).click());
      await guest.reload();
      await expect(guest.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue("Updated first room only");
      await guest.getByRole("textbox", { name: "Notes", exact: true }).fill("Unsaved first-room draft");
      await guest.getByRole("navigation", { name: "Your meal responses", exact: true })
        .getByRole("link", { name: `${second.title} · Second-room diner`, exact: true }).click();
      await expect(guest.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue("Second room note");
      await guest.goto(`/preferences?roomId=unrelated-room`);
      await expect(guest.getByRole("textbox", { name: "Notes", exact: true })).toHaveCount(0);
    } finally { await guestContext.close(); }
  });

  test("receives guest votes and shopping changes automatically without discarding a draft", async ({ browser, page }) => {
    await signInAsHost(page);
    const meal = await createMeal(page, "Friday dinner with friends");
    const guestContext = await browser.newContext({ baseURL: origin });
    try {
      const guest = await guestContext.newPage();
      await joinMeal(guest, meal.invitation, "Shared shopper", "");
      await expect(page.getByText("2 of 2 guests have responded.", { exact: false })).toBeVisible({ timeout: 25_000 });
      await page.goto(`/rooms/${meal.roomId}/plans`);
      await save(page, () => page.getByRole("button", { name: "Generate plans", exact: true }).click());
      await expect(page.getByRole("heading", { name: "Compare menus", exact: true })).toBeVisible();
      await expectNoAccessibilityViolations(page, "menu comparison");
      await captureResponsiveEvidence(page, "menu-comparison");
      const planId = await page.locator("article.plan-card").first().getAttribute("data-plan-id");
      const hostPlan = page.locator(`article.plan-card[data-plan-id="${planId}"]`);
      const reopen = page.locator("details.destructive-control").filter({ hasText: "Reopen guest preferences" });
      await reopen.locator("summary").click();
      const confirmation = reopen.getByRole("checkbox");
      await confirmation.check();
      await guest.goto(`/rooms/${meal.roomId}/plans`);
      await save(guest, () => guest.locator(`article.plan-card[data-plan-id="${planId}"]`).getByRole("button", { name: "Like", exact: true }).click());
      await expect(page.getByRole("status").filter({ hasText: "Updates are waiting" })).toBeVisible({ timeout: 25_000 });
      await expect(hostPlan.locator(".metric-grid")).toContainText("0 likes");
      // Canceling an ordinary confirmation must release draft protection too.
      await confirmation.uncheck();
      await expect(hostPlan.locator(".metric-grid")).toContainText("1 likes", { timeout: 25_000 });
      await reopen.locator("summary").click();
      const reason = guest.locator(`article.plan-card[data-plan-id="${planId}"]`).getByLabel("Veto reason", { exact: true });
      await reason.fill("Unsaved note to discuss with the host");
      await save(page, () => hostPlan.getByRole("button", { name: "Finalize plan", exact: true }).click());
      await guest.waitForResponse((response) => new URL(response.url()).pathname === `/api/rooms/${meal.roomId}/revision`, { timeout: 25_000 });
      await expect(reason).toHaveValue("Unsaved note to discuss with the host");
      await expect(guest.getByRole("status").filter({ hasText: "Updates are waiting" })).toBeVisible();
      await expect(guest.getByRole("heading", { name: "Your selected menu", exact: true })).toHaveCount(0);
      await reason.fill("");
      await guest.getByRole("heading", { name: meal.title, exact: true }).click();
      await expect(guest.getByRole("heading", { name: "Your selected menu", exact: true })).toBeVisible({ timeout: 25_000 });
      await expect(page.locator("article.plan-card:visible")).toHaveCount(1);
      await expect(page.locator("details.menu-alternatives")).not.toHaveAttribute("open", "");
      await expectNoAccessibilityViolations(page, "chosen menu");
      await captureResponsiveEvidence(page, "chosen-menu");
      await page.goto(`/rooms/${meal.roomId}/shopping`);
      await guest.goto(`/rooms/${meal.roomId}/shopping`);
      const hostRow = page.locator("article.shopping-row").first();
      const guestRow = guest.locator("article.shopping-row").first();
      const assignment = hostRow.getByRole("combobox");
      const savedAssignment = await assignment.inputValue();
      expect(savedAssignment).not.toBe("");
      await assignment.selectOption("");
      await guestRow.getByLabel("Purchased", { exact: true }).check();
      await save(guest, () => guestRow.getByRole("button", { name: "Save", exact: true }).click());
      // Observe an actual background check after the remote save; it must defer
      // the refresh while the host has an unsaved assignment.
      await page.waitForResponse((response) => new URL(response.url()).pathname === `/api/rooms/${meal.roomId}/revision`, { timeout: 25_000 });
      await expect(assignment).toHaveValue("");
      await expect(hostRow.getByLabel("Purchased", { exact: true })).not.toBeChecked();
      await assignment.selectOption(savedAssignment);
      await page.getByRole("heading", { name: meal.title, exact: true }).click();
      await expect(hostRow.getByLabel("Purchased", { exact: true })).toBeChecked({ timeout: 25_000 });
    } finally { await guestContext.close(); }
  });

  test("offers anonymous hosts a save-account path without replacing their current access", async ({ page, context }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Continue as guest", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const meal = await createMeal(page, `Saved access ${randomUUID()}`);
    const before = (await context.cookies()).find((cookie) => cookie.name.endsWith("tablesync-auth.session_token"));
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Save my rooms", exact: true }).first().click();
    await expect(page).toHaveURL(/\/auth\?upgrade=1$/);
    await expect(page.getByRole("button", { name: "Continue as guest", exact: true })).toHaveCount(0);
    const saveAccount = page.getByRole("button", { name: "Save my rooms with GitHub", exact: true });
    await expect(saveAccount).toBeVisible();
    // OAuth completion depends on the deployed provider setup; this checks the
    // local entry point and retention without faking a successful callback.
    expect(Boolean(before && (await context.cookies()).some((cookie) => cookie.name === before.name && cookie.value === before.value))).toBe(true);
    await page.goto(`/rooms/${meal.roomId}`);
    await expect(page.getByRole("heading", { name: meal.title, exact: true })).toBeVisible();
  });

  test("leaves a room with an update request in flight and resumes updates on return", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await signInAsHost(page);
    const meal = await createMeal(page, `Room navigation ${randomUUID()}`);
    const revisionPath = `/api/rooms/${meal.roomId}/revision`;
    const matchesRevision = (url: URL) => url.pathname === revisionPath;
    let release!: () => void;
    const heldResponse = new Promise<void>((resolve) => { release = resolve; });
    await page.route(matchesRevision, async (route) => {
      const response = await route.fetch();
      await heldResponse;
      await route.fulfill({ response });
    });
    try {
      const request = page.waitForRequest((request) => new URL(request.url()).pathname === revisionPath);
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await request;
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: /your meal rooms/i })).toBeVisible();
      release();
      await page.unrouteAll({ behavior: "wait" });
      const resumed = page.waitForResponse((response) => new URL(response.url()).pathname === revisionPath);
      await page.goBack();
      await expect(page.getByRole("heading", { name: meal.title, exact: true })).toBeVisible();
      expect((await resumed).ok()).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      release();
      await page.unrouteAll({ behavior: "wait" });
    }
  });
});
