import { expect, test } from "@playwright/test";

const addManualGroup = async (page: import("@playwright/test").Page, subject: string, className: string) => {
  await page.getByRole("tab", { name: "Lerngruppen" }).click();
  const form = page.getByText("Manuelle Lerngruppe anlegen", { exact: true }).locator("..");
  await form.getByLabel("Fach").fill(subject);
  await form.getByLabel("Klasse").fill(className);
  await form.getByRole("button", { name: "Eigenes Passwort" }).click();
  await form.getByLabel("Klassenpasswort").fill("e2e-test-passwort");
  await form.getByRole("button", { name: "Lerngruppe anlegen" }).click();
  await expect(page.getByRole("button", { name: `${subject} · ${className}`, exact: true })).toBeVisible();
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

  await addManualGroup(secondPage, "Zweitfach", "9b");
  await expect(secondPage.getByRole("heading", { name: "Arbeitsstand wurde in einem anderen Tab geändert" })).toBeVisible();
});
