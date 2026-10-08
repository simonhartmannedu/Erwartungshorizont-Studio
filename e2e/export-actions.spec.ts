import { expect, test } from "@playwright/test";

const openDemoResult = async (page: import("@playwright/test").Page, unlock = true) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  const globalSearch = page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" });
  const globalSearchResults = page.locator("#global-search-results");
  await globalSearch.fill("Unit 5");
  await globalSearchResults.getByRole("option", { name: /Englisch-Klassenarbeit Unit 5/ }).click();
  await page.getByRole("tab", { name: "Klassenarbeiten" }).click();
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();
  if (unlock) {
    await page.getByRole("button", { name: "Klasse entsperren", exact: true }).click();
    await page.locator("#header-unlock-password").fill("demo");
    await page.getByRole("button", { name: "Entsperren", exact: true }).click();
  }
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

test("exportiert Word-Dokumente über den passenden Browser-Speicherweg", async ({ page, browserName }) => {
  if (browserName === "chromium") {
    await page.addInitScript(() => {
      let writes = 0;
      let pickerCalls = 0;
      Object.defineProperty(window, "showSaveFilePicker", {
        configurable: true,
        value: async () => {
          pickerCalls += 1;
          return {
            createWritable: async () => ({
              write: async () => { writes += 1; },
              close: async () => undefined,
            }),
          };
        },
      });
      Object.defineProperty(window, "__wordExportWrites", { configurable: true, get: () => writes });
      Object.defineProperty(window, "__wordExportPickerCalls", { configurable: true, get: () => pickerCalls });
    });
  }
  await openDemoResult(page);

  await page.getByRole("button", { name: /Schülerbogen drucken/ }).click();
  const downloadPromise = browserName === "chromium" ? null : page.waitForEvent("download");
  await page.getByRole("button", { name: "Word (.docx)" }).click();
  if (browserName === "chromium") {
    await expect.poll(
      () => page.evaluate(() => (window as Window & { __wordExportPickerCalls?: number }).__wordExportPickerCalls),
      { timeout: 15_000 },
    ).toBe(1);
    await expect.poll(
      () => page.evaluate(() => (window as Window & { __wordExportWrites?: number }).__wordExportWrites),
      { timeout: 15_000 },
    ).toBe(1);
  } else {
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
  }
  await expect(page.getByText("Word-Dokument erstellt")).toBeVisible();
});

test("öffnet bei geschützten Exporten automatisch den Entsperr-Dialog", async ({ page }) => {
  await openDemoResult(page, false);

  await page.getByRole("button", { name: /Schülerbogen drucken/ }).click();
  await page.getByRole("button", { name: "Word (.docx)" }).click();
  await expect(page.getByRole("heading", { name: "Lerngruppe entsperren" })).toBeVisible();
});
