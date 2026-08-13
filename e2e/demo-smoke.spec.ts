import { expect, test } from "@playwright/test";

test("starts the local demo without external HTTP requests", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== "http://127.0.0.1:4173") {
      externalRequests.push(request.url());
    }
  });

  await page.goto("/?demo=1&freshDemo=1");

  await expect(page.getByRole("heading", { name: "Erwartungshorizont Studio" })).toBeVisible();
  await expect(page.getByText("Demo-Modus aktiv")).toBeVisible();
  await expect(page.getByText("Klassenpasswort")).toContainText("demo");
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await expect(page.getByRole("tab", { name: "Lerngruppen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Übersicht", exact: true })).toBeVisible();
  const globalSearch = page.getByRole("textbox", { name: "Schüler:innen und Klassenarbeiten durchsuchen" });
  const globalSearchResults = page.locator("#global-search-results");
  await globalSearch.fill("Unit 5");
  const unit5Result = globalSearchResults.getByRole("option", { name: /Englisch-Klassenarbeit Unit 5/ });
  await expect(unit5Result).toBeVisible();
  await unit5Result.click();
  await expect(page.getByRole("tab", { name: "EWH-Editor" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Titel der Klassenarbeit")).toHaveValue("Englisch-Klassenarbeit Unit 5");
  await globalSearch.fill("Student 8");
  await expect(globalSearchResults.getByRole("option", { name: /Student 8/ })).toBeVisible();
  await page.getByRole("button", { name: "Klasse entsperren", exact: true }).click();
  await page.locator("#header-unlock-password").fill("demo");
  await page.getByRole("button", { name: "Lerngruppe entschlüsseln" }).click();
  await expect(page.getByRole("button", { name: "Klasse sperren" })).toBeVisible();
  await globalSearch.fill("Emir Yılmaz");
  await expect(globalSearchResults.getByRole("option", { name: /Emir Yılmaz/ })).toBeVisible();
  expect(externalRequests).toEqual([]);
});
