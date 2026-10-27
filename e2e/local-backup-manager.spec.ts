import { expect, test } from "@playwright/test";

test("lists explicitly selected backup files without a persistent folder claim", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: undefined });
  });
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.getByRole("tab", { name: "Backup" }).click();

  const backupPanel = page.getByRole("tabpanel", { name: "Backup" });
  await backupPanel.getByRole("button", { name: "Vorhandene Sicherungen prüfen" }).click();
  await backupPanel.locator('input[type="file"][multiple]').setInputFiles([
    {
      name: "vollbackup-arbeitsstand-2026-10-06_13-45-00.backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({
        kind: "ewh-app-backup",
        version: 2,
        exportedAt: "2026-10-06T11:45:00.000Z",
        payload: { ciphertext: "", iv: "", salt: "" },
      }), "utf8"),
    },
    {
      name: "vollbackup-arbeitsstand-2024-10-06_13-45-00.backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({
        kind: "ewh-app-backup",
        version: 2,
        exportedAt: "2024-10-06T11:45:00.000Z",
        payload: { ciphertext: "", iv: "", salt: "" },
      }), "utf8"),
    },
  ]);

  await expect(backupPanel.getByText("Ansicht der ausgewählten Dateien. Es besteht keine dauerhafte Ordnerverbindung.")).toBeVisible();
  await expect(backupPanel.getByRole("heading", { name: "Vorhandene Sicherungen prüfen" })).toBeVisible();
  await expect(backupPanel.getByRole("button", { name: "Neue Sicherung erstellen" })).toHaveCount(0);
  await expect(backupPanel.getByRole("button", { name: /Schuljahr 2026\/27/ })).toBeVisible();
  await expect(backupPanel.getByRole("button", { name: /Oktober 2026/ })).toBeVisible();
  await expect(backupPanel.getByText("Zum Prüfen entsperren")).toBeVisible();
  await expect(backupPanel.getByText(/^Letzte Bearbeitung:/)).toBeVisible();
  await expect(backupPanel.getByText("1 Sicherung(en) sind älter als ein Schuljahr. Löschfrist prüfen.")).toBeVisible();

  await backupPanel.getByRole("button", { name: "Sicherung prüfen" }).first().click();
  const checkDialog = page.locator(".dialog-panel");
  await expect(checkDialog.getByRole("heading", { name: "Sicherung mit Passwort prüfen" })).toBeVisible();
  await checkDialog.getByLabel("Passwort dieser Backup-Datei").fill("e2e-passwort");
  await checkDialog.getByRole("button", { name: "Prüfen und Vorschau öffnen" }).click();
  await expect(checkDialog.getByRole("alert").filter({ hasText: "Die Sicherung konnte nicht geprüft werden" })).toBeVisible();
  await checkDialog.getByRole("button", { name: "Abbrechen" }).click();

  await backupPanel.getByRole("button", { name: /Schuljahr 2024\/25/ }).click();
  await backupPanel.getByRole("button", { name: /Oktober 2024/ }).click();
  await expect(backupPanel.locator(".backup-retention-attention")).toHaveCount(1);
  await expect(backupPanel.locator(".backup-retention-attention").getByText("Löschfrist prüfen")).toBeVisible();
});
