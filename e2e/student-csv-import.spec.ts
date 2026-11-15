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
