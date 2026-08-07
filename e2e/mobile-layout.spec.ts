import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("nutzt auf kleinen Displays die verfügbare Breite ohne horizontalen Seitenüberlauf", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  await expect(page.locator(".local-save-status")).toContainText(/Speichert lokal|Lokal gespeichert/);
  await expect(page.getByRole("button", { name: /Arbeitskontext/ })).toBeVisible();
  await expect(page.locator("#mobile-selection-panel")).not.toBeVisible();
  await page.getByRole("button", { name: /Arbeitskontext/ }).click();
  await expect(page.locator("#mobile-selection-panel")).toBeVisible();

  const layout = await page.evaluate(() => {
    const main = document.querySelector("main");
    const aside = document.querySelector("aside");
    const viewportWidth = window.innerWidth;
    return {
      documentFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      mainFits: main ? main.getBoundingClientRect().right <= viewportWidth : false,
      asideFits: aside ? aside.getBoundingClientRect().right <= viewportWidth : false,
    };
  });

  expect(layout).toEqual({ documentFits: true, mainFits: true, asideFits: true });
});
