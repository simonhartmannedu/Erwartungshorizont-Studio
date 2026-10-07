import { expect, test } from "@playwright/test";

test("filters the NRW-oriented example templates by school form", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("button", { name: "EWH erstellen" }).first().click();

  await expect(page.getByLabel("Vorlagen durchsuchen")).toBeVisible();
  const results = page.locator(".template-result-grid");
  await page.getByRole("button", { name: "Grundschule", exact: true }).click();
  await expect(results.getByText("Grundschule · Deutsch Klasse 4 · Lesen und Schreiben", { exact: true })).toBeVisible();
  await expect(results.getByText("Grundschule · Mathematik Klasse 4 · Rechnen im Alltag", { exact: true })).toBeVisible();
  await expect(results.getByText("Realschule · Deutsch 5/6 · Text verstehen und schreiben", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Realschule", exact: true }).click();
  await expect(results.getByText("Realschule · Deutsch 5/6 · Text verstehen und schreiben", { exact: true })).toBeVisible();
  await expect(results.getByText("Realschule · Englisch 5/6 · Reading und Writing", { exact: true })).toBeVisible();
  await expect(results.getByText("Grundschule · Deutsch Klasse 4 · Lesen und Schreiben", { exact: true })).toHaveCount(0);
});
