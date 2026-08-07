import { expect, test } from "@playwright/test";

test("bietet das Archivieren nur im Kontext des Editors an", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  await page.getByRole("tab", { name: "EWH-Editor" }).click();

  await expect(page.getByRole("button", { name: "Diese Arbeit archivieren" })).toBeVisible();
  await expect(page.getByText("Lokal gespeichert")).toBeVisible();
});
