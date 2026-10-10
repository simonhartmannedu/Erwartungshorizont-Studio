import { expect, test } from "@playwright/test";

test("switches between Easy Mode and the full workflow without losing the normal navigation", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  const settings = page.locator(".header-settings");
  const easyModeToggle = settings.locator('input[type="checkbox"]').first();
  await settings.locator("> summary").click();
  await easyModeToggle.check();

  await expect(page.getByRole("tab", { name: "Klassenarbeiten" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Lerngruppen" })).toBeHidden();
  await expect(page.getByRole("tab", { name: "Archiv" })).toBeHidden();
  await expect(page.getByRole("tab", { name: "EWH erstellen", selected: true })).toBeVisible();

  await page.getByRole("tab", { name: "Klassenarbeiten" }).click();
  await expect(page.locator(".editor-section-tabs").getByRole("tab", { name: "Überarbeiten", exact: true })).toBeVisible();
  await page.locator(".editor-section-tabs").getByRole("tab", { name: "Überarbeiten", exact: true }).click();
  await expect(page.getByText("Erwartungshorizont überarbeiten", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Schülercode")).toHaveCount(0);
  await expect(page.getByText("Erreicht", { exact: true })).toHaveCount(0);

  await easyModeToggle.uncheck();
  await expect(page.getByRole("tab", { name: "Lerngruppen" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Archiv" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Backup" })).toBeVisible();
  await expect(page.locator(".editor-section-tabs").getByRole("tab", { name: "Korrigieren", exact: true })).toBeVisible();
});

test("honours the Easy- and Expert-Mode links from the landing page", async ({ page }) => {
  await page.goto("/?mode=easy");
  await expect(page.getByRole("tab", { name: "Klassenarbeiten" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "EWH erstellen", selected: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Lerngruppen" })).toBeHidden();

  await page.goto("/?mode=expert");
  await expect(page.getByRole("tab", { name: "Lerngruppen" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Backup" })).toBeVisible();
});

test("prints a generic EWH from Easy Mode without using a student record", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  const settings = page.locator(".header-settings");
  await settings.locator("> summary").click();
  await settings.locator('input[type="checkbox"]').first().check();
  await page.getByRole("tab", { name: "Klassenarbeiten" }).click();
  await page.locator(".editor-section-tabs").getByRole("tab", { name: "Drucken & Exportieren", exact: true }).click();
  await expect(page.getByText("Gib den fertigen Erwartungshorizont ohne Schülerdaten als Druck-PDF oder Word-Datei aus.")).toBeVisible();

  await page.getByRole("button", { name: "Fertiger EWH", exact: true }).click();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Druck-PDF", exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup.getByRole("button", { name: "Druckdialog öffnen" })).toBeVisible({ timeout: 20_000 });
  await expect(popup.getByText("Schülercode:", { exact: false })).toHaveCount(0);
});
