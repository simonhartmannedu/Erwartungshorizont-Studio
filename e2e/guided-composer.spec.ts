import { expect, test } from "@playwright/test";

test("keeps the composer focused and leaves metadata for the editor", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("button", { name: "EWH erstellen" }).first().click();

  await page.locator(".template-result-card").first().click();
  await expect(page.locator(".composer-layout")).toBeVisible();
  await expect(page.locator(".composer-sidebar")).toHaveCount(0);
  await expect(page.locator(".composer-review")).toHaveCount(0);

  const initialTaskCount = await page.locator(".composer-task-row").count();
  await page.locator(".composer-section").first().getByRole("button", { name: "Baustein einfügen", exact: true }).nth(2).click();
  await page.locator(".task-insertion-menu .task-insertion-option").first().click();
  await expect(page.locator(".composer-task-row")).toHaveCount(initialTaskCount + 1);
  await expect(page.locator(".composer-task-row.task-just-inserted")).toHaveCount(1);

  const firstSection = page.locator(".composer-section").first();
  const taskRows = firstSection.locator(".composer-task-row");
  const firstTaskBeforeKeyboardMove = await taskRows.first().getAttribute("data-task-id");
  await firstSection.locator(".composer-drag-handle").first().focus();
  await page.keyboard.press("Space");
  await expect(firstSection.locator(".composer-task-row-dragging")).toHaveCount(1);
  await expect(page.locator(".composer-drag-overlay")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.keyboard.press("Space");
  await expect(taskRows.first()).not.toHaveAttribute("data-task-id", firstTaskBeforeKeyboardMove!);

  await page.locator(".composer-task-move").first().selectOption({ index: 1 });
  await expect(page.locator(".composer-task-row")).toHaveCount(initialTaskCount + 1);

  await page.getByRole("button", { name: "Vorschau & erstellen" }).click();
  await expect(page.getByRole("dialog", { name: "Vorschau & erstellen" })).toBeVisible();
  await expect(page.getByText("Rahmendaten", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "EWH erstellen" })).toBeVisible();
  await page.getByRole("button", { name: "Zurück zum Aufbau" }).click();
  await expect(page.locator(".composer-review")).toHaveCount(0);
});

test("opens the compact insertion menu as a mobile drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("button", { name: "EWH erstellen" }).first().click();
  await page.locator(".template-result-card").first().click();
  await page.locator(".composer-section").first().getByRole("button", { name: "Baustein einfügen", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "Aufgabe einfügen", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(page.locator(".task-insertion-menu")).toHaveCount(0);
});
