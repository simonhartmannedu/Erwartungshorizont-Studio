import { expect, test } from "@playwright/test";

const openDemoResult = async (page: import("@playwright/test").Page) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  const globalSearch = page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" });
  const globalSearchResults = page.locator("#global-search-results");
  await globalSearch.fill("Unit 5");
  await globalSearchResults.getByRole("option", { name: /Englisch-Klassenarbeit Unit 5/ }).click();
  await page.getByRole("tab", { name: "Klassenarbeiten" }).click();
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();
  await page.getByRole("button", { name: "Klasse entsperren", exact: true }).click();
  await page.locator("#header-unlock-password").fill("demo");
  await page.getByRole("button", { name: "Entsperren", exact: true }).click();
  await page.getByRole("tab", { name: "Ergebnis & Druck", exact: true }).click();
};

test("öffnet die Druckansicht für eine entsperrte Klasse direkt aus dem Klick", async ({ page }) => {
  await openDemoResult(page);

  await page.getByRole("button", { name: /Klasse drucken/ }).click();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Druck-PDF" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup.getByRole("button", { name: "Druckdialog öffnen" })).toBeVisible({ timeout: 20_000 });
});

test("übergibt den Word-Export an Chromiums Speicherdialog", async ({ page }) => {
  await page.addInitScript(() => {
    let writes = 0;
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: async () => ({
        createWritable: async () => ({
          write: async () => { writes += 1; },
          close: async () => undefined,
        }),
      }),
    });
    Object.defineProperty(window, "__wordExportWrites", { configurable: true, get: () => writes });
  });
  await openDemoResult(page);

  await page.getByRole("button", { name: /Aktueller Bewertungsbogen/ }).click();
  await page.getByRole("button", { name: "Word (.docx)" }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __wordExportWrites?: number }).__wordExportWrites)).toBe(1);
  await expect(page.getByText("Word-Dokument erstellt")).toBeVisible();
});
