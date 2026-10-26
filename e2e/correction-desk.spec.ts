import { expect, test } from "@playwright/test";

test("erfasst eine Aufgabe klassenweise und lässt zur Einzelkorrektur zurückkehren", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  const globalSearch = page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" });
  await globalSearch.fill("Unit 5");
  await page.locator("#global-search-results").getByRole("option", { name: /Englisch-Klassenarbeit Unit 5/ }).click();
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();
  await page.getByRole("button", { name: "Korrektur-Tisch", exact: true }).click();

  const correctionDesk = page.locator("section").filter({ has: page.getByRole("heading", { name: "Eine Aufgabe für die ganze Lerngruppe" }) });
  await expect(correctionDesk).toBeVisible();
  await correctionDesk.getByRole("button", { name: "Klasse entsperren", exact: true }).click();
  await page.locator("#header-unlock-password").fill("demo");
  await page.getByRole("button", { name: "Entsperren", exact: true }).click();

  await expect(page.locator(".correction-desk-score").first()).toBeEnabled();
  await expect(correctionDesk.getByRole("button", { name: /Mia Schneider.*Einzelkorrektur auswählen/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Nächste offene Eingabe", exact: true }).click();
  const activeScoreInput = page.locator(".correction-desk-score:focus");
  await expect(activeScoreInput).toHaveCount(1);
  const firstScoreInput = page.locator(".correction-desk-score").first();
  await firstScoreInput.fill("3");
  await firstScoreInput.press("Enter");
  await expect(page.locator(".correction-desk-score").nth(1)).toBeFocused();
  await expect(page.getByText("erfasst", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Einzelkorrektur", exact: true }).click();
  await expect(page.getByText("Geteilte Rubrik, individuelle Punkte", { exact: true })).toBeVisible();
});
