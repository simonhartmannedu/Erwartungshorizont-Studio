import { expect, test } from "@playwright/test";

test("imports a local SVG signature without shipping it with the app", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await page.getByRole("button", { name: "Einführung schließen" }).click();

  const globalSearch = page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" });
  const globalSearchResults = page.locator("#global-search-results");
  await globalSearch.fill("Unit 5");
  await globalSearchResults.getByRole("option", { name: /Englisch-Klassenarbeit Unit 5/ }).click();

  await page.getByRole("button", { name: "Klasse entsperren" }).click();
  await page.locator("#header-unlock-password").fill("demo");
  await page.getByRole("button", { name: "Lerngruppe entschlüsseln" }).click();

  await page.getByLabel("Schülercode").selectOption({ label: "Ananya Patel · Student 8 · korrigiert" });

  const fileInput = page.locator('input[type="file"][accept="image/svg+xml,.svg"]');
  await expect(fileInput).toBeAttached();
  await fileInput.setInputFiles({
    name: "eigene-signatur.svg",
    mimeType: "image/svg+xml",
    // XML preamble and comment deliberately mirror common exported signature files.
    buffer: Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<!-- local signature -->\n<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60"><path d="M8 42 C45 5, 80 58, 150 18" fill="none" stroke="#111827" stroke-width="4"/></svg>'),
  });

  const signaturePreview = page.getByRole("img", { name: "Digitale Unterschrift" });
  await expect(signaturePreview).toHaveAttribute("src", /^data:image\/png;base64,/);
});
