import { expect, test } from "@playwright/test";

test("passt aufgeklappte Aufgaben ohne horizontale Scrollleisten in den Korrekturbereich ein", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("tab", { name: "Klassenarbeit korrigieren" }).click();
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();
  await page.getByRole("button", { name: "Alle aufklappen", exact: true }).click();
  await expect(page.locator(".section-editor").first()).toBeVisible();

  for (const width of [390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator(".section-editor").first().getByRole("button", { name: "Aufgabenteil löschen", exact: true }).focus();
    const overflow = await page.locator(".section-editor").evaluateAll((sections) =>
      sections.flatMap((section) => [section, ...section.querySelectorAll(".overflow-x-auto")])
        .filter((element) => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1)
        .map((element) => ({ tag: element.tagName, className: element.className, width: element.clientWidth, scrollWidth: element.scrollWidth })),
    );
    expect(overflow, `Aufgabenüberlauf bei ${width}px`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("behält Punkte und Enter-Navigation beim Wechsel zwischen Karten und Tabelle bei", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" }).fill("Unit 5");
  await page.locator("#global-search-results").getByRole("option", { name: /Englisch-Klassenarbeit Unit 5/ }).click();
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();
  await page.getByLabel("Schülercode").selectOption("demo-student-8");
  await page.getByRole("button", { name: "Alle aufklappen", exact: true }).click();
  await page.locator('button[aria-label="Punkteingabe gesperrt – Klasse entsperren"]:visible').first().click();
  await page.locator("#header-unlock-password").fill("demo");
  await page.getByRole("button", { name: "Entsperren", exact: true }).click();

  const scores = page.locator(".score-input:visible");
  await page.setViewportSize({ width: 1280, height: 900 });
  await scores.first().fill("2,5");
  await scores.first().press("Enter");
  await expect(scores.nth(1)).toBeFocused();

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(scores.first()).toHaveValue("2.5");
  await scores.nth(1).fill("1");
  await scores.nth(1).press("Enter");
  await expect(scores.nth(2)).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(scores.nth(1)).toHaveValue("1");
});
