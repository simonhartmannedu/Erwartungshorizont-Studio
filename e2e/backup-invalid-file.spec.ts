import { expect, test } from "@playwright/test";

test("rejects malformed and unsupported backup files without opening a restore dialog", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.getByRole("tab", { name: "Backup" }).click();

  const backupPanel = page.getByRole("tabpanel", { name: "Backup" });
  await backupPanel.getByRole("button", { name: "Backup wiederherstellen" }).click();
  const restoreDialog = page.locator(".dialog-panel");
  const backupFileInput = restoreDialog.locator('input[type="file"]');
  await restoreDialog.getByLabel("Passwort dieser Backup-Datei").fill("e2e-passwort");

  await backupFileInput.setInputFiles({
    name: "beschaedigtes-e2e-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from("kein JSON", "utf8"),
  });
  await restoreDialog.getByRole("button", { name: "Inhalt prüfen" }).click();
  await expect(page.getByText("BACKUP_UNEXPECTED")).toBeVisible();
  await expect(page.locator(".dialog-panel")).toHaveCount(0);

  await backupPanel.getByRole("button", { name: "Backup wiederherstellen" }).click();
  const secondRestoreDialog = page.locator(".dialog-panel");
  await secondRestoreDialog.getByLabel("Passwort dieser Backup-Datei").fill("e2e-passwort");
  await backupFileInput.setInputFiles({
    name: "unbekanntes-e2e-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        kind: "ewh-app-backup",
        version: 999,
        exportedAt: "2026-08-06T00:00:00.000Z",
        payload: { ciphertext: "nicht-entschluesseln", iv: "nicht-entschluesseln", salt: "nicht-entschluesseln" },
      }),
      "utf8",
    ),
  });
  await secondRestoreDialog.getByRole("button", { name: "Inhalt prüfen" }).click();
  await expect(page.getByText("Die Sicherungsdatei ist ungültig.")).toBeVisible();
  await expect(page.locator(".dialog-panel")).toHaveCount(0);
});
