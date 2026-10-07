import { expect, test } from "@playwright/test";

test("organisiert die Klassenarbeit in Vorbereitung, Korrektur und Ausgabe", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("tab", { name: "Klassenarbeiten" }).click();

  const setupTab = page.getByRole("tab", { name: "Vorbereiten", exact: true });
  const tasksTab = page.getByRole("tab", { name: "Korrigieren", exact: true });
  const resultTab = page.getByRole("tab", { name: "Ergebnis & Druck", exact: true });

  await expect(setupTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Titel der Klassenarbeit")).toBeVisible();

  await tasksTab.click();
  await expect(tasksTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Geteilte Rubrik, individuelle Punkte", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Titel der Klassenarbeit")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Drucken und exportieren" })).not.toBeVisible();

  await resultTab.click();
  await expect(resultTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Ergebnis und Abschlussbereich" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Drucken und exportieren" })).toBeVisible();

  await setupTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tasksTab).toHaveAttribute("aria-selected", "true");
  await expect(tasksTab).toBeFocused();
});
