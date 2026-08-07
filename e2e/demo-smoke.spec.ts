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
  await page.getByRole("button", { name: "Einführung schließen" }).click();
  await expect(page.getByRole("tab", { name: "Lerngruppen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Übersicht" })).toBeVisible();
  expect(externalRequests).toEqual([]);
});
