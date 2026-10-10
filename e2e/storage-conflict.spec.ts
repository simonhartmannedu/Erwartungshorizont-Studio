import { expect, test } from "@playwright/test";

const addManualGroup = async (
  page: import("@playwright/test").Page,
  subject: string,
  className: string,
  expectSuccessfulSave = true,
) => {
  await page.getByRole("tab", { name: "Lerngruppen" }).click();
  await page.getByRole("button", { name: "Keine Liste? Lerngruppe manuell anlegen", exact: true }).click();
  const form = page.getByRole("region", { name: "Keine Liste? Lerngruppe manuell anlegen" });
  await form.getByLabel("Fach").fill(subject);
  await form.getByLabel("Klasse").fill(className);
  await form.getByRole("switch", { name: "Automatisches Security-Token verwenden" }).click();
  await form.getByLabel("Klassenpasswort").fill("e2e-test-passwort");
  await form.getByRole("button", { name: "Lerngruppe anlegen" }).click();
  if (expectSuccessfulSave) {
    // Creating a protected group derives a PBKDF2 verifier with 250,000
    // iterations. On a loaded CI worker, especially in Firefox, this can take
    // longer than Playwright's default five-second assertion window.
    await expect(page.getByRole("button", { name: `${subject} · ${className}`, exact: true })).toBeVisible({ timeout: 20_000 });
  }
};

test("stoppt einen veralteten zweiten Tab statt einen neueren Arbeitsstand zu überschreiben", async ({ context }) => {
  const firstPage = await context.newPage();
  await firstPage.goto("/?demo=1&freshDemo=1");
  await firstPage.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  await firstPage.evaluate(() => window.history.replaceState({}, "", "/?demo=1"));
  await firstPage.waitForTimeout(500);
  await firstPage.reload();

  const secondPage = await context.newPage();
  await secondPage.goto("/?demo=1");
  await expect(secondPage.getByRole("heading", { name: "Erwartungshorizont Studio" })).toBeVisible();

  await addManualGroup(firstPage, "Erstfach", "9a");
  await firstPage.waitForTimeout(500);
  await firstPage.reload();
  await firstPage.getByRole("tab", { name: "Lerngruppen" }).click();
  await expect(firstPage.getByRole("button", { name: "Erstfach · 9a", exact: true })).toBeVisible();

  // A stale tab must be stopped before its pending group can be persisted.
  // The old assertion expected the rejected group to briefly appear, which
  // made the test fail whenever the conflict check won that race immediately.
  await addManualGroup(secondPage, "Zweitfach", "9b", false);
  await expect(secondPage.getByRole("heading", { name: "Arbeitsstand wurde in einem anderen Tab geändert" })).toBeVisible();

  await secondPage.getByRole("button", { name: "Seite neu laden" }).click();
  await secondPage.getByRole("tab", { name: "Lerngruppen" }).click();
  await expect(secondPage.getByRole("button", { name: "Erstfach · 9a", exact: true })).toBeVisible();
  await expect(secondPage.getByRole("button", { name: "Zweitfach · 9b", exact: true })).toHaveCount(0);
});
