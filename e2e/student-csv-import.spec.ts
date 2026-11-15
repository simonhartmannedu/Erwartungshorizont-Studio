import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.evaluate(() => window.history.replaceState({}, "", "/?demo=1"));
  await page.getByRole("tab", { name: "Lerngruppen" }).click();
});

test("creates classes only after completing the selected CSV import and saves them", async ({ page }) => {
  const importer = page.locator("#group-import");
  const completeImport = importer.getByRole("button", { name: "Import abschließen", exact: true });
  await expect(completeImport).toBeDisabled();
  await importer.locator('input[type="file"]').setInputFiles({
    name: "klassen.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Nachname;Vorname;Klasse\nZweig;Änne;9csv\nMüller;Ümit;9csv\nBeispiel;Alex;8csv"),
  });
  await expect(importer.getByText("Ausgewählte Klassenliste: klassen.csv")).toBeVisible();
  await expect(completeImport).toBeEnabled();
  await expect(page.getByRole("button", { name: / · [89]csv$/ })).toHaveCount(0);

  // Settings chosen after selecting the file must apply to this import.
  await importer.getByLabel("Fach für importierte Klassen").fill("CSV-Testfach");
  await importer.getByLabel("Reihenfolge").selectOption("descending");
  await completeImport.click();

  const tokenDialog = page.locator(".dialog-panel").filter({ has: page.getByRole("heading", { name: "Security-Token sichern" }) });
  await expect(tokenDialog).toBeVisible();
  await expect(tokenDialog.getByText("CSV-Testfach · 8csv", { exact: true })).toBeVisible();
  await expect(tokenDialog.getByText("CSV-Testfach · 9csv", { exact: true })).toBeVisible();
  await tokenDialog.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(importer.getByRole("status")).toContainText("Import abgeschlossen: 3 Schüler. 8csv: 1 · 9csv: 2.");
  await expect(completeImport).toBeDisabled();
  await expect(importer.getByText(/Ausgewählte Klassenliste:/)).toHaveCount(0);

  const groupButton = page.getByRole("button", { name: "CSV-Testfach · 9csv", exact: true });
  const group = groupButton.locator("xpath=ancestor::section[1]");
  await groupButton.click();
  await expect(group.locator("tbody tr")).toHaveCount(2);
  await expect(group.locator("tbody tr").first()).toContainText("9CSV-01");
  await expect(group.locator("tbody tr").first()).toContainText("Zweig, Änne");
  await expect(page.locator(".local-save-status")).toHaveClass(/local-save-status-saved/);
  await page.reload();
  await page.getByRole("tab", { name: "Lerngruppen" }).click();
  await expect(page.getByRole("button", { name: "CSV-Testfach · 8csv", exact: true })).toBeVisible();
  await expect(groupButton).toBeVisible();
  await expect(group).toContainText("2 Schülercodes in dieser Liste.");
});

test("explains malformed CSV data and allows replacing the file and retrying after a missing password", async ({ page }) => {
  const importer = page.locator("#group-import");
  const fileInput = importer.locator('input[type="file"]');
  const completeImport = importer.getByRole("button", { name: "Import abschließen", exact: true });
  await fileInput.setInputFiles({
    name: "unvollstaendig.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Nachname;Vorname;Klasse\nBeispiel;Alex;"),
  });
  await completeImport.click();
  await expect(importer.getByRole("alert")).toContainText("Zeile 2 ist unvollstaendig.");
  await expect(importer.getByText("Ausgewählte Klassenliste: unvollstaendig.csv")).toBeVisible();
  await expect(completeImport).toBeEnabled();

  await fileInput.setInputFiles({
    name: "korrigiert.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Nachname;Vorname;Klasse\nBeispiel;Alex;7csv"),
  });
  await expect(importer.getByRole("alert")).toHaveCount(0);
  await importer.getByRole("switch", { name: "Automatisches Security-Token verwenden" }).click();
  await completeImport.click();
  await expect(importer.getByRole("alert")).toContainText("Für neue Klassen wird ein Import-Passwort benötigt.");
  await expect(page.getByRole("button", { name: / · 7csv$/ })).toHaveCount(0);
  await importer.getByPlaceholder("Passwort fuer neu importierte Klassen").fill("e2e-csv-passwort");
  await completeImport.click();
  await expect(importer.getByRole("status")).toContainText("Import abgeschlossen: 1 Schüler.");
  await expect(page.getByRole("button", { name: / · 7csv$/ })).toBeVisible();
  await expect(completeImport).toBeDisabled();
});

test("explains skipped locked classes and reports partial imports accurately", async ({ page }) => {
  const importer = page.locator("#group-import");
  const fileInput = importer.locator('input[type="file"]');
  const completeImport = importer.getByRole("button", { name: "Import abschließen", exact: true });
  await importer.getByLabel("Fach für importierte Klassen").fill("CSV-Testfach");
  await importer.getByRole("switch", { name: "Automatisches Security-Token verwenden" }).click();
  await importer.getByPlaceholder("Passwort fuer neu importierte Klassen").fill("e2e-csv-passwort");
  const lockedClassFile = {
    name: "gesperrte-klasse.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Nachname;Vorname;Klasse\nBeispiel;Alex;6csv"),
  };
  await fileInput.setInputFiles(lockedClassFile);
  await completeImport.click();
  await expect(importer.getByRole("status")).toContainText("Import abgeschlossen: 1 Schüler.");
  const lockedGroup = page.getByRole("button", { name: "CSV-Testfach · 6csv", exact: true }).locator("xpath=ancestor::section[1]");
  await page.getByRole("switch", { name: /Klasse inaktiv/ }).first().click();
  await expect(lockedGroup).toContainText("Nur Schülercodes sichtbar");

  await fileInput.setInputFiles(lockedClassFile);
  await completeImport.click();
  await expect(importer.getByRole("alert")).toContainText("Es wurden keine Schüler importiert.");
  await expect(importer.getByRole("alert")).toContainText("Übersprungen: 6csv.");
  await expect(importer.getByRole("alert")).toContainText("zuerst entsperrt");
  await expect(completeImport).toBeEnabled();
  await expect(lockedGroup).toContainText("1 Schülercodes in dieser Liste.");

  await fileInput.setInputFiles({
    name: "gemischte-klassen.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Nachname;Vorname;Klasse\nBeispiel;Alex;6csv\nMuster;Mia;5csv"),
  });
  await completeImport.click();
  await expect(importer.getByRole("status")).toContainText("Import abgeschlossen: 1 Schüler. 5csv: 1.");
  await expect(importer.getByRole("status")).toContainText("Übersprungen: 6csv.");
  await expect(page.getByRole("button", { name: "CSV-Testfach · 5csv", exact: true })).toBeVisible();
  await expect(lockedGroup).toContainText("1 Schülercodes in dieser Liste.");
});

test("imports the same class independently for two subjects and selects the correct group", async ({ page }) => {
  const importer = page.locator("#group-import");
  const fileInput = importer.locator('input[type="file"]');
  const completeImport = importer.getByRole("button", { name: "Import abschließen", exact: true });
  const file = {
    name: "klasse-8fach.csv", mimeType: "text/csv",
    buffer: Buffer.from("Nachname;Vorname;Klasse\nBeispiel;Alex;8fach\nMüller;Mia;8fach"),
  };
  await importer.getByRole("switch", { name: "Automatisches Security-Token verwenden" }).click();
  await importer.getByPlaceholder("Passwort fuer neu importierte Klassen").fill("e2e-englisch-passwort");
  await importer.getByLabel("Fach für importierte Klassen").fill("Englisch");
  await fileInput.setInputFiles(file);
  await completeImport.click();
  await expect(importer.getByRole("status")).toContainText("Import abgeschlossen: 2 Schüler.");
  const english = page.getByRole("button", { name: "Englisch · 8fach", exact: true }).locator("xpath=ancestor::section[1]");
  await expect(english).toContainText("2 Schülercodes in dieser Liste.");

  await importer.getByLabel("Fach für importierte Klassen").fill("Mathematik");
  await importer.getByPlaceholder("Passwort fuer neu importierte Klassen").fill("e2e-mathe-passwort");
  await fileInput.setInputFiles(file);
  await completeImport.click();
  await expect(importer.getByRole("status")).toContainText("Import abgeschlossen: 2 Schüler.");
  const maths = page.getByRole("button", { name: "Mathematik · 8fach", exact: true }).locator("xpath=ancestor::section[1]");
  await expect(maths.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await expect(maths).toContainText("2 Schülercodes in dieser Liste.");
  await expect(english).toContainText("2 Schülercodes in dieser Liste.");
  await expect(english).toContainText("Nur Schülercodes sichtbar");

  // A locked class in the same subject must still require unlocking.
  await importer.getByLabel("Fach für importierte Klassen").fill(" englisch ");
  await fileInput.setInputFiles(file);
  await completeImport.click();
  await expect(importer.getByRole("alert")).toContainText("Übersprungen: 8fach.");
  await expect(english).toContainText("2 Schülercodes in dieser Liste.");
  await expect(maths).toContainText("2 Schülercodes in dieser Liste.");
  await expect(page.getByRole("button", { name: / · 8fach$/ })).toHaveCount(2);
});

test("duplicates a class for another subject with independent students and access protection", async ({ page }) => {
  const importer = page.locator("#group-import");
  await importer.getByRole("switch", { name: "Automatisches Security-Token verwenden" }).click();
  await importer.getByPlaceholder("Passwort fuer neu importierte Klassen").fill("e2e-quelle-passwort");
  await importer.getByLabel("Fach für importierte Klassen").fill("Englisch");
  await importer.locator('input[type="file"]').setInputFiles({
    name: "klasse-9dup.csv", mimeType: "text/csv",
    buffer: Buffer.from("Nachname;Vorname;Klasse\nBeispiel;Alex;9dup\nMüller;Mia;9dup"),
  });
  await importer.getByRole("button", { name: "Import abschließen", exact: true }).click();
  await expect(importer.getByRole("status")).toContainText("Import abgeschlossen: 2 Schüler.");
  const source = page.getByRole("button", { name: "Englisch · 9dup", exact: true }).locator("xpath=ancestor::section[1]");
  const sourceIds = await source.locator('[id^="student-roster-row-"]').evaluateAll((rows) => rows.map((row) => row.id));
  expect(sourceIds).toHaveLength(2);
  await source.getByRole("button", { name: "Klasse duplizieren", exact: true }).click();
  const form = page.getByRole("form", { name: "Klasse für weiteres Fach duplizieren" });
  await form.getByLabel("Fach der neuen Lerngruppe").fill(" englisch ");
  await form.getByRole("button", { name: "Für weiteres Fach anlegen", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("gibt es bereits");
  await form.getByLabel("Fach der neuen Lerngruppe").fill("Mathematik");
  await form.getByRole("button", { name: "Für weiteres Fach anlegen", exact: true }).click();
  const tokenDialog = page.locator(".dialog-panel").filter({ has: page.getByRole("heading", { name: "Security-Token sichern" }) });
  await expect(tokenDialog.getByText("Mathematik · 9dup", { exact: true })).toBeVisible();
  await tokenDialog.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(form).toHaveCount(0);
  const maths = page.getByRole("button", { name: "Mathematik · 9dup", exact: true }).locator("xpath=ancestor::section[1]");
  await expect(maths.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await expect(maths.locator("tbody tr")).toHaveCount(2);
  await expect(maths.locator("tbody tr").first()).toContainText("Beispiel, Alex");
  await expect(maths.locator("tbody tr").first()).toContainText("9DUP-01");
  const targetIds = await maths.locator('[id^="student-roster-row-"]').evaluateAll((rows) => rows.map((row) => row.id));
  expect(targetIds.every((id) => !sourceIds.includes(id))).toBe(true);
  await expect(source).toContainText("2 Schülercodes in dieser Liste.");

  await source.getByRole("button", { name: "Klasse duplizieren", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("entsperre sie oben über das Schloss");
  await expect(form.getByRole("button", { name: "Für weiteres Fach anlegen", exact: true })).toBeDisabled();
  await form.getByRole("button", { name: "Abbrechen", exact: true }).click();

  await maths.getByRole("button", { name: "Klasse duplizieren", exact: true }).click();
  await form.getByLabel("Fach der neuen Lerngruppe").fill("Physik");
  await form.getByRole("switch", { name: "Automatisches Security-Token verwenden" }).click();
  await form.getByRole("button", { name: "Für weiteres Fach anlegen", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("Bitte vergib ein Passwort");
  await form.getByLabel("Passwort der neuen Lerngruppe").fill("e2e-physik-passwort");
  await form.getByRole("button", { name: "Für weiteres Fach anlegen", exact: true }).click();
  await expect(form).toHaveCount(0);
  const physics = page.getByRole("button", { name: "Physik · 9dup", exact: true }).locator("xpath=ancestor::section[1]");
  await expect(physics).toContainText("2 Schülercodes in dieser Liste.");
  await expect(physics.locator("tbody tr").first()).toContainText("Beispiel, Alex");
  await expect(page.locator(".local-save-status")).toHaveClass(/local-save-status-saved/);
  await page.reload();
  await page.getByRole("tab", { name: "Lerngruppen" }).click();
  await expect(source).toContainText("2 Schülercodes in dieser Liste.");
  await expect(maths).toContainText("2 Schülercodes in dieser Liste.");
  await expect(physics).toContainText("2 Schülercodes in dieser Liste.");
});
