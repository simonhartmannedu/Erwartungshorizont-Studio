import { expect, test } from "@playwright/test";

test("erfordert die Einwilligung vor der Auswahl einer PDF", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.getByRole("tab", { name: "EWH erstellen" }).click();
  await page.getByRole("button", { name: "PDF" }).click();

  const pdfInput = page.locator('input[type="file"][accept="application/pdf,.pdf"]');
  await expect(pdfInput).toBeDisabled();
  await expect(page.getByText("Bitte bestätige zuerst die Einwilligung.")).toBeVisible();

  await page.getByLabel(/Ich bestätige, dass die ausgewählte PDF/).check();
  await expect(pdfInput).toBeEnabled();
});
