import { expect, test } from "@playwright/test";

test("pins favorite themes to the top of the theme picker", async ({ page }) => {
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  await page.getByText("Einstellungen", { exact: true }).click();
  await page.getByLabel("Darstellung: Erklärvideo bei 1,25×").click();
  const favoriteButton = page.getByRole("button", { name: "PDF, aber schick als favorisieren" });
  await favoriteButton.click();

  await expect(page.getByRole("button", { name: "PDF, aber schick nicht mehr favorisieren" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".theme-picker-select").first()).toHaveText("PDF, aber schick");
  await page.reload();
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await page.getByText("Einstellungen", { exact: true }).click();
  await page.getByLabel("Darstellung: Erklärvideo bei 1,25×").click();
  await expect(page.getByRole("button", { name: "PDF, aber schick nicht mehr favorisieren" })).toHaveAttribute("aria-pressed", "true");
});
