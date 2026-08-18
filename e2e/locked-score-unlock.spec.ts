import { expect, test } from "@playwright/test";

test("opens the unlock dialog when a locked score field is selected", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  const globalSearch = page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" });
  const globalSearchResults = page.locator("#global-search-results");
  await globalSearch.fill("Unit 5");
  await globalSearchResults.getByRole("option", { name: /Englisch-Klassenarbeit Unit 5/ }).click();
  await page.getByLabel("Schülercode").selectOption("demo-student-8");
  await page.getByRole("tab", { name: "Bewertung", exact: true }).click();

  await page.locator('button[aria-label="Punkteingabe gesperrt – Klasse entsperren"]:visible').first().click();
  await expect(page.getByRole("heading", { name: "Punkteingabe entsperren" })).toBeVisible();
  await expect(page.getByText("Die Punkte dieser Lerngruppe sind geschützt.")).toBeVisible();
});
