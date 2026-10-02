import type { Page } from "@playwright/test";

export async function openOptionalCreationFields(page: Page, section: "gathering" | "preferences") {
  const details = page.locator('details[data-optional-section="' + section + '"]');
  if (await details.count() && await details.getAttribute("open") === null) {
    await details.locator("summary").click();
  }
}
