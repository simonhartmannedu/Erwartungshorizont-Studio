import { expect, test } from "@playwright/test";

test("switches between Easy Mode and the full workflow without losing the normal navigation", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  const settings = page.locator(".header-settings");
  const easyModeToggle = settings.locator('input[type="checkbox"]').first();
  await settings.locator("summary").click();
  await easyModeToggle.check();

  await expect(page.getByRole("tab", { name: "EWH erstellen" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "EWH-Editor" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Lerngruppen" })).toBeHidden();
  await expect(page.getByRole("tab", { name: "EWH-Archiv" })).toBeHidden();
  await expect(page.getByText("Der EWH wird ohne Lerngruppe angelegt.")).toBeVisible();

  await easyModeToggle.uncheck();
  await expect(page.getByRole("tab", { name: "Lerngruppen" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "EWH-Archiv" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Backup" })).toBeVisible();
});

test("honours the Easy- and Expert-Mode links from the landing page", async ({ page }) => {
  await page.goto("/?mode=easy");
  await expect(page.getByRole("tab", { name: "EWH erstellen" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Lerngruppen" })).toBeHidden();

  await page.goto("/?mode=expert");
  await expect(page.getByRole("tab", { name: "Lerngruppen" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Backup" })).toBeVisible();
});
