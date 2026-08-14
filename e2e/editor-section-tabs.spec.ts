import { expect, test } from "@playwright/test";

test("organisiert den EWH-Editor in Rahmendaten, Bewertung und Ergebnis & Druck", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByRole("tab", { name: "EWH-Editor" }).click();

  const setupTab = page.getByRole("tab", { name: "Rahmendaten", exact: true });
  const tasksTab = page.getByRole("tab", { name: "Bewertung", exact: true });
  const resultTab = page.getByRole("tab", { name: "Ergebnis & Druck", exact: true });

  await expect(setupTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Titel der Klassenarbeit")).toBeVisible();

  await tasksTab.click();
  await expect(tasksTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Abschnitte", { exact: true })).toBeVisible();
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
