import { expect, test } from "@playwright/test";

test("persists a group assignment for an archived workspace copy after reload", async ({ page }) => {
  const subject = "Testfach";
  const className = "9z";
  const groupLabel = `${subject} · ${className}`;

  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await page.evaluate(() => window.history.replaceState({}, "", "/?demo=1"));

  await page.getByRole("tab", { name: "EWH-Editor" }).click();
  await page.getByRole("button", { name: "Vorlage im Archiv speichern" }).click();
  await expect(page.getByRole("heading", { name: "Erwartungshorizont-Archiv" })).toBeVisible();

  await page.getByRole("tab", { name: "Lerngruppen" }).click();
  const manualGroupForm = page.getByText("Manuelle Lerngruppe anlegen", { exact: true }).locator("..");
  await manualGroupForm.getByLabel("Fach").fill(subject);
  await manualGroupForm.getByLabel("Klasse").fill(className);
  await manualGroupForm.getByRole("button", { name: "Eigenes Passwort" }).click();
  await manualGroupForm.getByLabel("Klassenpasswort").fill("e2e-test-passwort");
  await manualGroupForm.getByRole("button", { name: "Lerngruppe anlegen" }).click();
  await expect(page.getByRole("button", { name: groupLabel, exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "EWH-Archiv" }).click();
  await page.getByTitle("Lerngruppe zuordnen").click();
  await page.getByLabel("Lerngruppe auswählen").selectOption({ label: groupLabel });
  await page.getByTitle("Ausgewählter Lerngruppe zuordnen").click();
  await expect(page.getByRole("tab", { name: "EWH-Editor", selected: true })).toBeVisible();
  await expect(page.locator(".local-save-status")).toHaveClass(/local-save-status-saved/);

  await page.reload();
  await page.getByRole("tab", { name: "EWH-Archiv" }).click();
  await expect(page.getByText(new RegExp(`Zugeordnet: .*${groupLabel}`))).toBeVisible();
});
