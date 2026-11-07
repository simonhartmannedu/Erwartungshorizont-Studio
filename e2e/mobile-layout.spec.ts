import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("nutzt auf kleinen Displays die verfügbare Breite ohne horizontalen Seitenüberlauf", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("tab", { name: "Klassenarbeit korrigieren" }).click();
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();

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

test("richtet alle drei Korrekturspalten oben bündig aus", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("tab", { name: "Klassenarbeit korrigieren" }).click();
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();

  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["Einzelkorrektur", "Korrektur-Tisch"]) {
      await page.getByRole("group", { name: "Korrekturmodus wählen", exact: true })
        .getByRole("button", { name: mode, exact: true }).click();
      const selection = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Auswahl", exact: true }) });
      const summary = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Individuelle Auswertung", exact: true }) });
      const content = page.getByRole("tabpanel", { name: "Korrigieren", exact: true });
      const boxes = await Promise.all([selection.boundingBox(), content.boundingBox(), summary.boundingBox()]);

      expect(boxes.every(Boolean)).toBe(true);
      expect(Math.abs(boxes[0]!.y - boxes[1]!.y), `${mode} bei ${width}px: Mitte`).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes[0]!.y - boxes[2]!.y), `${mode} bei ${width}px: rechts`).toBeLessThanOrEqual(1);
    }
  }
});
