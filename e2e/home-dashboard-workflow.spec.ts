import { expect, test } from "@playwright/test";

test("shows one next step and keeps the detailed workflow collapsed", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  const dashboard = page.getByRole("region", { name: "Übersicht" });
  await expect(dashboard.getByText("Nächster Schritt", { exact: true })).toBeVisible();
  await expect(dashboard.getByText("Einrichtungsplan anzeigen", { exact: true })).toBeVisible();
  await expect(dashboard.getByText("So bleibt eine Klassenarbeit übersichtlich")).toHaveCount(0);
  await expect(dashboard.locator(".home-workflow-list")).toBeHidden();

  await dashboard.getByText("Einrichtungsplan anzeigen", { exact: true }).click();
  await expect(dashboard.locator(".home-workflow-list")).toBeVisible();
});
