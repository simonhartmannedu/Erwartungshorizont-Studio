import { expect, test } from "@playwright/test";

const openBogencheck = async (page: import("@playwright/test").Page) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("button", { name: "Klasse entsperren", exact: true }).click();
  await page.locator("#header-unlock-password").fill("demo");
  await page.getByRole("button", { name: "Entsperren", exact: true }).click();
  await page.getByRole("tab", { name: "Bogencheck" }).click();
};

test.skip("druckt Ankreuzfelder für mehrere Multiple-Choice- und Zuordnungsraster auf jedem Bogen", async ({ page }) => {
  await openBogencheck(page);

  await page.getByRole("button", { name: "Multiple Choice" }).click();
  await page.getByRole("button", { name: "Multiple Choice" }).click();
  await page.getByRole("button", { name: "Zuordnung" }).click();

  const multipleChoiceCards = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Multiple Choice" }) });
  const matchingCard = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Zuordnung" }) });
  await multipleChoiceCards.nth(0).getByLabel("Lösungsschlüssel").fill("A, B");
  await multipleChoiceCards.nth(0).getByLabel("Lösungsschlüssel").blur();
  await multipleChoiceCards.nth(1).getByLabel("Lösungsschlüssel").fill("A, C, D");
  await multipleChoiceCards.nth(1).getByLabel("Lösungsschlüssel").blur();
  await matchingCard.getByLabel("Lösungsschlüssel").fill("1-A, 2-C");
  await matchingCard.getByLabel("Lösungsschlüssel").blur();

  await page.getByRole("button", { name: "Arbeitscodes erzeugen" }).click();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Beiblätter & Tabelle drucken" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");

  const sheets = popup.locator("article.sheet");
  await expect(sheets).toHaveCount(25);
  await expect(sheets.first().locator(".answer-bubble")).toHaveCount(28);
  await expect(sheets.nth(1).locator(".answer-bubble")).toHaveCount(28);
});

test.skip("stellt alle rastertauglichen Bogencheck-Formate bereit", async ({ page }) => {
  await openBogencheck(page);

  await page.getByRole("button", { name: "Mehrfachauswahl" }).click();
  await page.getByRole("button", { name: "Richtig / Falsch" }).click();
  await page.getByRole("button", { name: "Reihenfolge" }).click();

  await expect(page.getByRole("heading", { name: "Mehrfachauswahl" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Richtig / Falsch" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reihenfolge" })).toBeVisible();
});

test("blendet Bogencheck in der Hauptnavigation aus", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  await expect(page.getByRole("tab", { name: "Bogencheck" })).toHaveCount(0);
});
