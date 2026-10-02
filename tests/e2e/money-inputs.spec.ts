import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { signInAsHost } from "./host-auth";

const origin = process.env.TABLESYNC_E2E_BASE_URL ?? "http://localhost:3000";

// Current main has no disclosures; progressive creation keeps these fields inside them.
async function openOptionalBudgetFields(page: Page) {
  for (const section of ["gathering", "preferences"]) {
    const details = page.locator(`details[data-optional-section="${section}"]`);
    if (await details.count() && await details.getAttribute("open") === null) {
      await details.locator("summary").click();
    }
  }
}

async function fillValidMoney(input: Locator, value: string) {
  await expect(input).toBeEnabled();
  for (const invalid of ["0", "0.001", "12.345", "1000000.01"]) {
    await input.fill(invalid);
    expect(await input.evaluate((element: HTMLInputElement) => element.checkValidity()), `${invalid} must be rejected by native money validation`).toBe(false);
  }
  await input.fill("");
  expect(await input.evaluate((element: HTMLInputElement) => element.checkValidity()), "An optional empty budget must remain valid").toBe(true);
  await input.fill(value);
  expect(await input.evaluate((element: HTMLInputElement) => element.checkValidity()), `${value} must be accepted by native money validation`).toBe(true);
}

async function savePreferences(page: Page) {
  const previous = new URL(page.url()).searchParams.get("updated");
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("updated"), { timeout: 20_000 }).not.toBe(previous);
  await expect(page.locator('form[data-state="pending"]')).toHaveCount(0);
}

test("accepts and retains cent-precision room budgets and guest comfort through later edits", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await signInAsHost(page);
  await page.goto("/rooms/new", { waitUntil: "networkidle" });
  await openOptionalBudgetFields(page);
  const title = `Cent budgets ${randomUUID()}`;
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Description", { exact: true }).fill(`TableSync E2E ${process.env.TABLESYNC_E2E_RUN_ID ?? "local"}`);
  await page.getByLabel("Expected guests", { exact: true }).fill("2");
  await page.getByLabel("Name", { exact: true }).fill("Cent-budget host");
  await fillValidMoney(page.getByLabel("Total budget", { exact: true }), "0.50");
  await fillValidMoney(page.getByLabel("Budget comfort", { exact: true }), "25.50");
  const invalidCreationFields = await page.locator("form.live-new-room-form").evaluate((form: HTMLFormElement) =>
    Array.from(form.elements).filter((element) => "validity" in element && !(element as HTMLInputElement).validity.valid)
      .map((element) => (element as HTMLInputElement).name)
  );
  expect(invalidCreationFields, "All native creation fields should permit submission").toEqual([]);
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({ timeout: 20_000 });
  const roomId = new URL(page.url()).pathname.split("/").at(-1)!;
  const invitation = await page.getByLabel("Guest invite link").inputValue();
  await expect(page.locator(".metric-card").filter({ has: page.getByText("Budget", { exact: true }) })).toContainText("$0.50");
  await page.getByRole("link", { name: "My preferences", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your preferences", exact: true })).toBeVisible();
  await expect(page.getByLabel("Budget comfort", { exact: true })).toHaveValue("25.5");
  await page.goto(`/rooms/${roomId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();

  const guestContext = await browser.newContext({ baseURL: origin });
  try {
    const guest = await guestContext.newPage();
    await guest.goto(invitation, { waitUntil: "domcontentloaded" });
    await openOptionalBudgetFields(guest);
    await guest.getByLabel("Name", { exact: true }).fill("Cent-budget guest");
    await fillValidMoney(guest.getByLabel("Budget comfort", { exact: true }), "25.50");
    await guest.getByRole("button", { name: "Join room", exact: true }).click();
    await expect(guest.getByRole("heading", { name: "Your preferences", exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(guest.getByLabel("Budget comfort", { exact: true })).toHaveValue("25.5");
    await fillValidMoney(guest.getByLabel("Budget comfort", { exact: true }), "12.34");
    await savePreferences(guest);

    await guest.goto(`/rooms/${roomId}`, { waitUntil: "domcontentloaded" });
    await guest.getByRole("link", { name: "My preferences", exact: true }).click();
    await expect(guest.getByLabel("Budget comfort", { exact: true })).toHaveValue("12.34");
    // A saved fractional value must not block a later change to another field.
    await guest.getByRole("textbox", { name: "Notes", exact: true }).fill("Keep my saved cent budget.");
    await savePreferences(guest);
    await guest.reload({ waitUntil: "domcontentloaded" });
    await expect(guest.getByLabel("Budget comfort", { exact: true })).toHaveValue("12.34");
    await expect(guest.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue("Keep my saved cent budget.");
  } finally {
    await guestContext.close();
  }

  await page.goto(`/rooms/${roomId}/edit`, { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Total budget", { exact: true })).toHaveValue("0.5");
  await fillValidMoney(page.getByLabel("Total budget", { exact: true }), "0.01");
  await page.getByRole("button", { name: "Save room details", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(`/rooms/${roomId}`);
  await page.goto(`/rooms/${roomId}/edit`, { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Total budget", { exact: true })).toHaveValue("0.01");
  await page.getByLabel("Location", { exact: true }).fill("Saved cents at the kitchen table");
  await page.getByRole("button", { name: "Save room details", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(`/rooms/${roomId}`);
  await page.goto(`/rooms/${roomId}/edit`, { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Total budget", { exact: true })).toHaveValue("0.01");
  await expect(page.getByLabel("Location", { exact: true })).toHaveValue("Saved cents at the kitchen table");
});
