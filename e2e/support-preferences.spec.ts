import { expect, test } from "@playwright/test";

test("speichert ausgeschaltete Ko-fi-Popups, unterdrückt Export und Druck und erhält die Vollbackup-Ausnahme", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    Object.defineProperty(window, "showSaveFilePicker", { configurable: true, value: undefined });
  });
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.evaluate(() => window.history.replaceState({}, "", "/?demo=1"));
  const settings = page.locator(".header-settings");
  await settings.locator("> summary").click();
  const preference = settings.getByRole("checkbox", { name: /Ko-fi-Popups anzeigen/ });
  await expect(preference).toBeChecked();
  await preference.uncheck();
  await expect(page.locator(".app-footer-support")).toBeVisible();
  await settings.locator("> summary").click();
  await page.reload();
  await settings.locator("> summary").click();
  await expect(preference).not.toBeChecked();
  await settings.locator("> summary").click();

  await page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" }).fill("Unit 5");
  await page.locator("#global-search-results").getByRole("option", { name: /Englisch-Klassenarbeit Unit 5/ }).click();
  await page.getByRole("tab", { name: "Ergebnis & Druck", exact: true }).click();
  await page.getByRole("group", { name: "Dokumentausgabe wählen", exact: true }).getByRole("button", { name: /^Leerer EWH/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Word (.docx)", exact: true }).click();
  await download;
  await expect(page.getByText("Leerer Word-EWH erstellt", { exact: true })).toBeVisible();
  const supportHeading = page.getByRole("heading", { name: "Export/Backup fertig. Kaffee verdient. ☕" });
  await expect(supportHeading).toHaveCount(0);
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Druck-PDF", exact: true }).click();
  const printWindow = await popup;
  await printWindow.waitForLoadState("domcontentloaded");
  await expect(printWindow.getByRole("button", { name: "Druckdialog öffnen" })).toBeVisible();
  await expect(supportHeading).toHaveCount(0);
  await printWindow.close();

  await page.getByRole("tab", { name: "Backup", exact: true }).click();
  await page.getByRole("tabpanel", { name: "Backup", exact: true }).getByRole("button", { name: "Backup speichern", exact: true }).click();
  const dialog = page.locator(".dialog-panel");
  await dialog.getByLabel("Backup-Passwort").fill("fictional-backup-password");
  const backupDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /Backup (speichern|herunterladen)/ }).click();
  await backupDownload;
  await expect(supportHeading).toBeVisible();
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await settings.locator("> summary").click();
  await preference.check();
  await expect(page.locator(".app-footer-support")).toBeVisible();
});
