import { expect, test } from "@playwright/test";

test("lists explicitly selected backup files without a persistent folder claim", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: undefined });
  });
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.getByRole("tab", { name: "Backup" }).click();

  const backupPanel = page.getByRole("tabpanel", { name: "Backup" });
  await backupPanel.locator('input[type="file"][multiple]').setInputFiles({
    name: "vollbackup-arbeitsstand-2026-10-06_13-45-00.backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      kind: "ewh-app-backup",
      version: 2,
      exportedAt: "2026-10-06T11:45:00.000Z",
      payload: { ciphertext: "", iv: "", salt: "" },
    }), "utf8"),
  });

  await expect(backupPanel.getByText("Ansicht der ausgewählten Dateien. Es besteht keine dauerhafte Ordnerverbindung.")).toBeVisible();
  await expect(backupPanel.getByRole("heading", { name: "Lokale Sicherungen verwalten" })).toBeVisible();
  await expect(backupPanel.getByRole("button", { name: /Schuljahr 2026\/27/ })).toBeVisible();
  await expect(backupPanel.getByRole("button", { name: /Oktober 2026/ })).toBeVisible();
  await expect(backupPanel.getByText("Zum Prüfen entsperren")).toBeVisible();
  await expect(backupPanel.getByText("Datum aus Backup-Metadaten · Löschfrist prüfen")).toBeVisible();
  await expect(backupPanel.getByText(/^Letzte Bearbeitung:/)).toBeVisible();
});
