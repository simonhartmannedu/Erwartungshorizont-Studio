import { expect, test } from "@playwright/test";

test("rejects malformed and unsupported backup files without opening a restore dialog", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.getByRole("tab", { name: "Backup" }).click();

  const backupPanel = page.getByRole("tabpanel", { name: "Backup" });
  const backupFileInput = backupPanel.locator('input[type="file"]').first();

  await backupFileInput.setInputFiles({
    name: "beschaedigtes-e2e-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from("kein JSON", "utf8"),
  });
  await expect(page.getByText("BACKUP_UNEXPECTED")).toBeVisible();
  await expect(page.locator(".dialog-panel")).toHaveCount(0);

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
  await expect(page.getByText("Die Sicherungsdatei ist ungültig.")).toBeVisible();
  await expect(page.locator(".dialog-panel")).toHaveCount(0);
});
