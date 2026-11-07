import { expect, test, type Page } from "@playwright/test";

const openWork = async (page: Page, fresh = true) => {
  if (fresh) {
    await page.goto("/?demo=1&freshDemo=1");
    await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
    await page.evaluate(() => window.history.replaceState({}, "", "/?demo=1"));
  }
  await page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" }).fill("Unit 5");
  await page.locator("#global-search-results").getByRole("option", { name: /Englisch-Klassenarbeit Unit 5/ }).click();
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();
  await page.locator(".app-navigation-security-button").click();
  await page.locator("#header-unlock-password").fill("demo");
  await page.getByRole("button", { name: "Entsperren", exact: true }).click();
  await page.getByRole("tab", { name: "Ergebnis & Druck", exact: true }).click();
  await expect(page.getByRole("button", { name: "Abschlussprüfung", exact: true })).toBeVisible();
};

test("prüft Rubrikänderungen, erneute Durchsicht und Teilnahme ohne bestehende Punkte zu löschen", async ({ page }, testInfo) => {
  // This flow deliberately queues several protected writes for the full demo
  // class. Wait for the real persistence result before testing a reload.
  test.setTimeout(120_000);
  await openWork(page);
  await page.getByLabel("Schülercode").selectOption("demo-student-1");
  await page.getByRole("button", { name: "Abschlussprüfung", exact: true }).click();
  const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Abschlussprüfung", exact: true, includeHidden: true }) });
  await expect(panel.locator('[aria-label^="Abschlussprüfung für"] > p').first()).toContainText("Bewertungsgrundlage noch nicht bestätigt");
  await panel.getByRole("button", { name: "Bewertungen geprüft", exact: true }).click();
  await expect(panel.locator('[aria-label^="Abschlussprüfung für"] > p').first()).toContainText("Abschluss geprüft");
  await panel.getByRole("button", { name: "Zweite Durchsicht vormerken", exact: true }).click();
  await expect(panel.locator('[aria-label^="Abschlussprüfung für"] > p').first()).toContainText("Abschließende Durchsicht offen");
  await panel.getByRole("button", { name: "Bewertungen geprüft", exact: true }).click();

  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();
  await page.locator(".section-editor").first().getByRole("button", { name: "Aufklappen", exact: true }).click();
  const description = page.locator(".section-editor").first().locator('textarea[placeholder="Stichpunkte oder mögliche Schülerantwort"]:visible').first();
  await description.fill(`${await description.inputValue()} Zusätzlich einen Textbeleg erklären.`);
  await page.getByRole("tab", { name: "Ergebnis & Druck", exact: true }).click();
  await expect(panel.locator('[aria-label^="Abschlussprüfung für"] > p').first()).toContainText("Bewertungen nach Änderung der Rubrik");
  await panel.getByRole("button", { name: "Offene Stelle anzeigen", exact: true }).click();
  await expect(page.locator(".score-input:visible").first()).toBeFocused();
  await page.getByRole("tab", { name: "Ergebnis & Druck", exact: true }).click();
  await panel.getByRole("button", { name: "Bewertungen geprüft", exact: true }).click();
  await expect(panel.locator('[aria-label^="Abschlussprüfung für"] > p').first()).toContainText("Abschluss geprüft");
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();
  await page.getByLabel("Nimmt an dieser Klassenarbeit teil", { exact: false }).uncheck();
  await page.getByRole("tab", { name: "Ergebnis & Druck", exact: true }).click();
  await expect(panel.locator('[aria-label^="Abschlussprüfung für"] > p').first()).toContainText("Keine Teilnahme, aber Bewertungen oder Kommentar vorhanden");
  await panel.getByRole("button", { name: "Ausschluss geprüft", exact: true }).click();
  await expect(panel.locator('[aria-label^="Abschlussprüfung für"] > p').first()).toContainText("Keine Teilnahme · berücksichtigt");
  await page.getByRole("tab", { name: "Korrigieren", exact: true }).click();
  await page.getByLabel("Nimmt an dieser Klassenarbeit teil", { exact: false }).check();
  await page.getByRole("tab", { name: "Ergebnis & Druck", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Bewertungen geprüft", exact: true })).toBeEnabled();
  await panel.getByRole("button", { name: "Bewertungen geprüft", exact: true }).click();
  await expect(page.locator(".local-save-status")).toContainText("Lokal gespeichert", { timeout: 90_000 });
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("abschlusspruefung.png") });
  await page.locator(".app-navigation-security-button").click();
  await expect(page.getByRole("button", { name: "Für Abschlussprüfung entsperren", exact: true })).toBeVisible();
  await expect(page.locator(".local-save-status")).toContainText("Lokal gespeichert", { timeout: 20_000 });
  await page.reload();
  await openWork(page, false);
  await page.getByLabel("Schülercode").selectOption("demo-student-1");
  await page.getByRole("button", { name: "Abschlussprüfung", exact: true }).click();
  await expect(panel.locator('[aria-label^="Abschlussprüfung für"] > p').first()).toContainText("Abschluss geprüft");
});

test("lässt unberührte Punktefelder offen und springt zur nächsten fehlenden Eingabe", async ({ page }) => {
  await openWork(page);
  const lastStudentId = await page.getByLabel("Schülercode").locator("option").last().getAttribute("value");
  await page.getByLabel("Schülercode").selectOption(lastStudentId!);
  await page.getByRole("button", { name: "Abschlussprüfung", exact: true }).click();
  const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Abschlussprüfung", exact: true, includeHidden: true }) });
  await expect(panel.getByRole("button", { name: "Bewertungen geprüft", exact: true })).toBeDisabled();
  await panel.getByRole("button", { name: "Offene Stelle anzeigen", exact: true }).click();
  const first = page.locator(".score-input:visible").first();
  await expect(first).toBeFocused();
  const before = await panel.locator('[aria-label^="Abschlussprüfung für"] > p').first().textContent();
  await first.press("Tab");
  await expect(panel.locator('[aria-label^="Abschlussprüfung für"] > p').first()).toHaveText(before!);
  await first.press("Enter");
  await expect(page.locator(".score-input:visible").nth(1)).toBeFocused();
  await expect(panel.locator('[aria-label^="Abschlussprüfung für"] > p').first()).not.toHaveText(before!);
  await page.getByRole("tab", { name: "Ergebnis & Druck", exact: true }).click();
  await panel.getByRole("button", { name: "Offene Stelle anzeigen", exact: true }).click();
  await expect(page.locator(".score-input:visible").nth(1)).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
