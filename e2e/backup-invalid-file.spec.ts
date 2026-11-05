import { expect, test } from "@playwright/test";

test("shows malformed and unsupported backup files in the unified restore flow", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.getByRole("tab", { name: "Backup" }).click();

  const backupPanel = page.getByRole("tabpanel", { name: "Backup" });
  await backupPanel.getByRole("button", { name: "Wiederherstellen" }).click();
  const restoreFlow = backupPanel.getByRole("region", { name: "Lokales Backup wiederherstellen" });
  const backupFileInput = restoreFlow.locator('input[type="file"][multiple]');

  await backupFileInput.setInputFiles({
    name: "beschaedigtes-e2e-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from("kein JSON", "utf8"),
  });
  await restoreFlow.getByRole("button", { name: "Sicherung prüfen" }).click();
  const checkDialog = page.locator(".dialog-panel");
  await checkDialog.getByLabel("Passwort dieser Backup-Datei").fill("e2e-passwort");
  await checkDialog.getByRole("button", { name: "Prüfen und Vorschau öffnen" }).click();
  await expect(page.getByText("BACKUP_UNEXPECTED")).toBeVisible();
  await checkDialog.getByRole("button", { name: "Abbrechen" }).click();

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
  await expect(restoreFlow.getByText("Prüfstatus: Nicht unterstützt")).toBeVisible();
  await expect(restoreFlow.getByRole("button", { name: "Sicherung prüfen" })).toHaveCount(0);
});
