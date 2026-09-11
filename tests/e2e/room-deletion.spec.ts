import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { fillGuestPreferences } from "./guest-preferences";
import { signInAsHost } from "./host-auth";
import { captureResponsiveEvidence, expectNoAccessibilityViolations } from "./quality-helpers";

const origin = process.env.TABLESYNC_E2E_BASE_URL ?? "http://localhost:3000";
const expiryNotice = "Rooms expire 7 days after creation and are automatically deleted.";
const confirmationLabel = "I understand that this room and all its data will be permanently deleted.";

test("only the creator can confirm permanent deletion, and every room link stops working", async ({ browser, page }) => {
  test.setTimeout(120_000);
  const title = `Delete room ${randomUUID()}`;
  expect((await page.request.get("/api/cron/rooms")).status()).toBe(401);
  await signInAsHost(page);
  await expect(page.getByText(expiryNotice, { exact: false })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "New room", exact: true }).click();
  await expect(page.getByText(expiryNotice, { exact: false })).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Description", { exact: true }).fill(`TableSync E2E ${process.env.TABLESYNC_E2E_RUN_ID ?? "local"}`);
  await page.getByRole("combobox", { name: "Event type", exact: true }).selectOption("DINNER");
  await page.getByLabel("Expected guests", { exact: true }).fill("2");
  await page.getByLabel("Total budget", { exact: true }).fill("120");
  await page.getByLabel("Public share page", { exact: true }).check();
  await fillGuestPreferences(page, { name: "Deleting room creator", diet: "OMNIVORE" });
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({ timeout: 20_000 });
  const roomPath = new URL(page.url()).pathname;
  const roomId = roomPath.match(/^\/rooms\/([^/]+)$/)?.[1];
  if (!roomId) throw new Error("Expected the newly created room overview.");
  const inviteUrl = await page.getByLabel("Guest invite link", { exact: true }).inputValue();
  await expect(page.getByText(expiryNotice, { exact: false })).toContainText("Expires");

  const deletion = page.locator("details").filter({ has: page.locator("summary", { hasText: /^Delete room$/ }) });
  const confirmation = deletion.getByRole("checkbox", { name: confirmationLabel, exact: true });
  await deletion.locator("summary").click();
  await expect(confirmation).not.toBeChecked();
  await expect(confirmation).toHaveAttribute("required", "");
  await deletion.getByRole("button", { name: "Delete room permanently", exact: true }).click();
  expect(await confirmation.evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true);
  await expect(page).toHaveURL(new RegExp(`${roomPath}$`));
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  // Closing the disclosure backs out without submitting a destructive action.
  await deletion.locator("summary").click();
  await page.reload();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(confirmation).not.toBeVisible();

  const guestContext = await browser.newContext({ baseURL: origin });
  try {
    const guestPage = await guestContext.newPage();
    await guestPage.goto(inviteUrl);
    await expect(guestPage.getByText(expiryNotice, { exact: false })).toBeVisible();
    await fillGuestPreferences(guestPage, { name: "Deleting room participant", diet: "VEGETARIAN", allergies: "peanut" });
    await guestPage.getByRole("button", { name: "Join room", exact: true }).click();
    await expect(guestPage.getByRole("heading", { name: "Your preferences", exact: true })).toBeVisible();
    await guestPage.goto(roomPath);
    await expect(guestPage.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(guestPage.locator("summary", { hasText: /^Delete room$/ })).toHaveCount(0);
    await expect(guestPage.getByRole("button", { name: "Delete room permanently", exact: true })).toHaveCount(0);

    // Exercise deletion with a real finalized menu and shopping list, including
    // a public share page that is accessible before the room is removed.
    await page.goto(`${roomPath}/plans`);
    await page.getByRole("button", { name: /generate plans/i }).click();
    await expect(page.getByRole("heading", { name: "Voting is open", exact: true })).toBeVisible({ timeout: 45_000 });
    await page.locator("article.plan-card").first().getByRole("button", { name: /finalize plan/i }).click();
    await expect(page.getByText("Finalized", { exact: true })).toBeVisible({ timeout: 30_000 });
    await guestPage.goto(`/share/${roomId}`);
    await expect(guestPage.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await page.goto(roomPath);
    await deletion.locator("summary").click();
    await expect(confirmation).not.toBeChecked();
    await expectNoAccessibilityViolations(page, "room deletion confirmation");
    await captureResponsiveEvidence(page, "room-deletion-confirmation");
    await confirmation.check();
    await deletion.getByRole("button", { name: "Delete room permanently", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\?deleted=1$/, { timeout: 20_000 });
    await expect(page.getByRole("status")).toContainText("Room deleted.");
    await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0);

    for (const path of [roomPath, `${roomPath}/plans`, `${roomPath}/shopping`, `${roomPath}/edit`]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "This page is unavailable", exact: true })).toBeVisible();
    }
    for (const path of [roomPath, inviteUrl, `/share/${roomId}`]) {
      await guestPage.goto(path);
      await expect(guestPage.getByRole("heading", { name: "This page is unavailable", exact: true })).toBeVisible();
      await expect(guestPage.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
    }
    const revision = await guestPage.request.get(`/api/rooms/${roomId}/revision`);
    expect(revision.status()).toBe(404);
    await guestPage.goto(`/preferences?roomId=${roomId}`);
    await expect(guestPage.getByRole("heading", { name: "Open your meal invitation", exact: true })).toBeVisible();
    await expect(guestPage.getByRole("button", { name: "Save preferences", exact: true })).toHaveCount(0);
  } finally {
    await guestContext.close();
  }
});
