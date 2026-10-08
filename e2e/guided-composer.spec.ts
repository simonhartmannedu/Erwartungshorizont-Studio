import { expect, test } from "@playwright/test";

test("keeps the composer focused and moves final settings into review", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("button", { name: "EWH erstellen" }).first().click();

  await page.locator(".template-result-card").first().click();
  await expect(page.locator(".composer-layout")).toBeVisible();
  await expect(page.getByRole("tab", { name: /Bibliothek/ })).toBeVisible();
  await expect(page.locator(".composer-review")).toHaveCount(0);

  const initialTaskCount = await page.locator(".composer-task-row").count();
  await page.locator(".composer-library-task .composer-add-button").first().click();
  await expect(page.locator(".composer-task-row")).toHaveCount(initialTaskCount + 1);

  const firstSection = page.locator(".composer-section").first();
  const taskTitles = firstSection.locator(".composer-task-row strong");
  const firstTaskBeforeKeyboardMove = await taskTitles.first().innerText();
  await firstSection.locator(".composer-drag-handle").first().focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);
  await page.keyboard.press("Space");
  await expect(taskTitles.first()).not.toHaveText(firstTaskBeforeKeyboardMove);

  await page.locator(".composer-task-move").first().selectOption({ index: 1 });
  await expect(page.locator(".composer-task-row")).toHaveCount(initialTaskCount + 1);

  await page.getByRole("button", { name: "Vorschau & erstellen" }).click();
  await expect(page.getByRole("dialog", { name: "Vorschau & erstellen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "EWH erstellen" })).toBeVisible();
  await page.getByRole("button", { name: "Zurück zum Aufbau" }).click();
  await expect(page.locator(".composer-review")).toHaveCount(0);
});

test("opens composer tools as a mobile drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("button", { name: "EWH erstellen" }).first().click();
  await page.locator(".template-result-card").first().click();

  await page.getByRole("button", { name: "Bibliothek", exact: true }).click();
  await expect(page.locator(".composer-layout-tools-open .composer-sidebar")).toBeVisible();
  await page.getByRole("button", { name: "Werkzeuge schließen" }).click();
  await expect(page.locator(".composer-layout-tools-open")).toHaveCount(0);
});
