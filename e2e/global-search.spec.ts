import { expect, test } from "@playwright/test";

test("findet Klassenarbeiten und entsperrte Namen mit Tippfehlern und verwirft sensible Suchtreffer beim Sperren", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Nicht mehr anzeigen" }).click();
  const search = page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" });
  const results = page.locator("#global-search-results");
  await search.fill("5 Englsch");
  await expect(results.getByRole("option").first()).toContainText("Englisch-Klassenarbeit Unit 5");
  await search.press("ArrowDown");
  await expect(results.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await search.press("Enter");
  await expect(search).toHaveValue("");
  await search.fill("Schnedier Mia");
  await expect(results.getByRole("option")).toHaveCount(0);

  await search.press("Escape");
  await expect(results).toHaveCount(0);
  await expect(search).toBeFocused();
  await page.locator(".app-navigation-security-button").click();
  await page.locator("#header-unlock-password").fill("demo");
  await page.getByRole("button", { name: "Entsperren", exact: true }).click();
  await expect(page.locator("#header-unlock-password")).toHaveCount(0);
  await search.fill("Schnedier Mia");
  await expect(results.getByRole("option").first()).toContainText("Mia Schneider");
  await search.fill('"Mia Schneider"');
  await expect(results.getByRole("option").first()).toContainText("Mia Schneider");
  await search.fill("Mia -Schneider");
  await expect(results.getByRole("option")).toHaveCount(0);
  await search.fill("Schnedier Mia");
  await page.locator(".app-navigation-security-button").click();
  await expect(search).toHaveValue("");
  await search.fill("Schnedier Mia");
  await expect(results.getByRole("option")).toHaveCount(0);
});
