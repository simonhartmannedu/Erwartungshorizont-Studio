import { expect, test } from "@playwright/test";

test("searches clear names only during an unlocked class session", async ({ page }) => {
  const subject = "Testfach";
  const className = "9s";
  const groupLabel = `${subject} · ${className}`;
  const fullName = "Muster, Mia";

  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.getByRole("tab", { name: "Lerngruppen" }).click();

  const manualGroupForm = page.getByRole("region", { name: "Manuelle Lerngruppe anlegen" });
  await manualGroupForm.getByLabel("Fach").fill(subject);
  await manualGroupForm.getByLabel("Klasse").fill(className);
  await manualGroupForm.getByRole("switch", { name: "Automatisches Security-Token verwenden" }).click();
  await manualGroupForm.getByLabel("Klassenpasswort").fill("e2e-test-passwort");
  await manualGroupForm.getByRole("button", { name: "Lerngruppe anlegen" }).click();

  const groupSection = page.getByRole("button", { name: groupLabel, exact: true }).locator("xpath=ancestor::section[1]");
  await groupSection.getByPlaceholder("Schülercode, z. B. E8B-01").fill("T9S-01");
  await groupSection.getByPlaceholder("Klarname").fill(fullName);
  await groupSection.getByRole("button", { name: "Schüler hinzufügen" }).click();

  const globalSearch = page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" });
  const globalSearchResults = page.locator("#global-search-results");
  await globalSearch.fill(fullName);
  await expect(globalSearchResults.getByRole("option", { name: new RegExp(fullName) })).toBeVisible();

  const activeClassToggle = groupSection.getByRole("switch");
  const inactiveClassToggle = page.getByRole("switch", { name: /Klasse inaktiv/ }).first();
  await inactiveClassToggle.click();

  await expect(activeClassToggle).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("switch", { name: /Klasse aktiv/ })).toHaveAttribute("aria-checked", "true");
  await expect(groupSection.getByText("Nur Schülercodes sichtbar")).toBeVisible();

  await expect(globalSearch).toHaveValue("");
  await globalSearch.fill(fullName);
  await expect(globalSearchResults).toContainText(`Keine Treffer für „${fullName}“`);
});
