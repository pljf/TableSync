import type { Page } from "@playwright/test";
import type { DietType, SpiceLevel } from "../../src/lib/domain";

export type GuestPreferences = {
  name: string;
  diet: DietType;
  allergies?: string;
  dislikes?: string;
  likes?: string;
  spice?: SpiceLevel;
  canBring?: boolean;
  notes?: string;
};

export async function fillGuestPreferences(page: Page, guest: GuestPreferences) {
  await page.getByLabel("Name", { exact: true }).fill(guest.name);
  await page.getByRole("combobox", { name: "Diet type", exact: true }).selectOption(guest.diet);
  await page.getByRole("combobox", { name: "Spice tolerance", exact: true }).selectOption(guest.spice ?? "MEDIUM");
  await page.getByLabel("Allergies", { exact: true }).fill(guest.allergies ?? "");
  await page.getByLabel("Disliked ingredients", { exact: true }).fill(guest.dislikes ?? "");
  await page.getByLabel("Liked ingredients", { exact: true }).fill(guest.likes ?? "");
  await page.getByLabel("I can bring groceries or food", { exact: true }).setChecked(guest.canBring ?? false);
  await page.getByRole("textbox", { name: "Notes", exact: true }).fill(guest.notes ?? "");
}
