import { expect, test } from "@playwright/test";

test("creates an encrypted backup, rejects a wrong password and restores only after confirmation", async ({ page }) => {
  const backupPassphrase = "e2e-backup-passphrase";

  // Chromium exposes the native picker API in automation but cannot complete its OS dialog.
  // The production fallback is the regular browser download, which is the portable E2E path.
  await page.addInitScript(() => {
    Object.defineProperty(window, "showSaveFilePicker", { configurable: true, value: undefined });
  });
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.evaluate(() => window.history.replaceState({}, "", "/?demo=1"));

  await page.getByRole("tab", { name: "Backup" }).click();
  const backupPanel = page.getByRole("tabpanel", { name: "Backup" });

  await backupPanel.getByRole("button", { name: "Backup speichern" }).click();
  const saveDialog = page.locator(".dialog-panel");
  await saveDialog.getByLabel("Backup-Passwort").fill(backupPassphrase);
  const downloadPromise = page.waitForEvent("download");
  await saveDialog.getByRole("button", { name: "Backup speichern" }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();

  expect(backupPath).not.toBeNull();
  await expect(page.getByText("Backup exportiert")).toBeVisible();

  await backupPanel.getByRole("button", { name: "Backup wiederherstellen" }).click();
  const wrongPasswordDialog = page.locator(".dialog-panel");
  const backupFileInput = wrongPasswordDialog.locator('input[type="file"]');
  await wrongPasswordDialog.getByLabel("Passwort dieser Backup-Datei").fill("falsches-e2e-passwort");
  await backupFileInput.setInputFiles(backupPath!);
  await wrongPasswordDialog.getByRole("button", { name: "Inhalt prüfen" }).click();
  await expect(page.getByText("BACKUP_DECRYPT_FAILED")).toBeVisible();

  await backupPanel.getByRole("button", { name: "Backup wiederherstellen" }).click();
  const restorePreparationDialog = page.locator(".dialog-panel");
  await restorePreparationDialog.getByLabel("Passwort dieser Backup-Datei").fill(backupPassphrase);
  await restorePreparationDialog.locator('input[type="file"]').setInputFiles(backupPath!);
  await restorePreparationDialog.getByRole("button", { name: "Inhalt prüfen" }).click();

  const restoreDialog = page.locator(".dialog-panel");
  await expect(restoreDialog).toBeVisible();
  const restoreButton = restoreDialog.getByRole("button", { name: "Ersetzen und wiederherstellen" });
  await expect(restoreButton).toBeDisabled();

  await restoreDialog.getByLabel("Ich verstehe, dass bestehende lokale Daten ersetzt werden.").check();
  await expect(restoreButton).toBeEnabled();
  await restoreButton.click();

  await expect(page.getByText("Arbeitsstand importiert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Erwartungshorizont Studio" })).toBeVisible();
});
