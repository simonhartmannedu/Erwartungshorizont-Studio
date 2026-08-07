import { expect, test } from "@playwright/test";

test("searches clear names only during an unlocked class session", async ({ page }) => {
  const subject = "Testfach";
  const className = "9s";
  const groupLabel = `${subject} · ${className}`;
  const fullName = "Muster, Mia";

  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.getByRole("tab", { name: "Lerngruppen" }).click();

  const manualGroupForm = page.getByText("Manuelle Lerngruppe anlegen", { exact: true }).locator("..");
  await manualGroupForm.getByLabel("Fach").fill(subject);
  await manualGroupForm.getByLabel("Klasse").fill(className);
  await manualGroupForm.getByRole("button", { name: "Eigenes Passwort" }).click();
  await manualGroupForm.getByLabel("Klassenpasswort").fill("e2e-test-passwort");
  await manualGroupForm.getByRole("button", { name: "Lerngruppe anlegen" }).click();

  const groupSection = page.getByRole("button", { name: groupLabel, exact: true }).locator("xpath=ancestor::section");
  await groupSection.getByPlaceholder("Schülercode, z. B. E8B-01").fill("T9S-01");
  await groupSection.getByPlaceholder("Klarname").fill(fullName);
  await groupSection.getByRole("button", { name: "Schüler hinzufügen" }).click();

  const globalSearch = page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" });
  const globalSearchResults = page.locator("#global-search-results");
  await globalSearch.fill(fullName);
  await expect(globalSearchResults.getByRole("option", { name: new RegExp(fullName) })).toBeVisible();

  await page.getByRole("tab", { name: "EWH-Editor" }).click();
  await page.getByRole("button", { name: "Klasse sperren" }).click();

  await expect(globalSearch).toHaveValue("");
  await globalSearch.fill(fullName);
  await expect(globalSearchResults).toContainText(`Keine Treffer für „${fullName}“`);
});
