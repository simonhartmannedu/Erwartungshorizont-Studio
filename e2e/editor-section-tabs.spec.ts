import { expect, test } from "@playwright/test";

test("Reiter und Korrektur-Pills erzeugen beim Hover keinen vertikalen Scrollbereich", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("tab", { name: "Klassenarbeit korrigieren" }).click();
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const label of ["Vorbereiten", "Korrigieren"]) {
      await page.getByRole("tab", { name: label, exact: true }).hover();
      await expect.poll(() => page.locator(".editor-toolbar, .editor-section-tabs, .editor-correction-modes")
        .evaluateAll((elements) => elements.map((element) => element.scrollHeight - element.clientHeight)),
      { message: `Vertikaler Überlauf bei ${width}px, Hover auf ${label}` }).toEqual([0, 0, 0]);
    }
  }
});

test("organisiert die Klassenarbeit in Vorbereitung, Korrektur und Ausgabe", async ({ page }, testInfo) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("tab", { name: "Klassenarbeit korrigieren" }).click();

  const setupTab = page.getByRole("tab", { name: "Vorbereiten", exact: true });
  const tasksTab = page.getByRole("tab", { name: "Korrigieren", exact: true });
  const resultTab = page.getByRole("tab", { name: "Ergebnis & Druck", exact: true });

  await expect(setupTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Titel der Klassenarbeit")).toBeVisible();

  await tasksTab.click();
  await expect(tasksTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Geteilte Rubrik, individuelle Punkte", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Individuelle Auswertung", exact: true })).toBeVisible();
  const sidebar = page.locator("aside").filter({ has: page.getByRole("heading", { name: "Individuelle Auswertung", exact: true }) });
  await expect(sidebar.locator(".editor-toc")).toBeVisible();
  const contentBox = await page.locator("main").boundingBox();
  const sidebarBox = await sidebar.boundingBox();
  expect(sidebarBox!.x).toBeGreaterThanOrEqual(contentBox!.x + contentBox!.width);
  await expect(page.getByRole("heading", { name: "Abschlussprüfung", exact: true })).toBeHidden();
  await expect(page.locator(".editor-toolbar").getByRole("button", { name: "Einzelkorrektur", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Korrekturmodus wählen", exact: true }).getByRole("button")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Rubrik bearbeiten", exact: true })).toHaveCount(0);
  const tabsBox = await page.locator(".editor-section-tabs").boundingBox();
  const modeBox = await page.getByRole("group", { name: "Korrekturmodus wählen", exact: true }).boundingBox();
  expect(Math.abs((tabsBox!.y + tabsBox!.height / 2) - (modeBox!.y + modeBox!.height / 2))).toBeLessThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath("korrekturansicht.png") });
  await expect(page.getByLabel("Titel der Klassenarbeit")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Drucken und exportieren" })).not.toBeVisible();
  await page.locator(".section-editor").first().getByRole("button").first().click();
  const taskActions = page.getByRole("group", { name: /Unteraufgabenaktionen für/ }).first();
  await expect(taskActions).toHaveCSS("flex-direction", "column");
  await expect(taskActions.getByRole("button", { name: "Nach oben" })).toBeDisabled();
  await expect(taskActions.getByRole("button", { name: "In Liste umwandeln" })).toBeVisible();
  const answer = page.locator(".section-editor").first().locator('textarea[placeholder="Stichpunkte oder mögliche Schülerantwort"]:visible').first();
  await answer.fill("Eigene Erwartung direkt in der Einzelkorrektur.");
  await expect(answer).toHaveValue("Eigene Erwartung direkt in der Einzelkorrektur.");

  await resultTab.click();
  await expect(resultTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Ergebnis und Abschlussbereich" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Drucken und exportieren" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Abschlussprüfung", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Individuelle Auswertung", exact: true })).toBeVisible();

  await setupTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tasksTab).toHaveAttribute("aria-selected", "true");
  await expect(tasksTab).toBeFocused();
});
