import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const version = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;

test("prüft das Pages-Artefakt mit Landingpage, produktiver App, Demo und relativen Ressourcen", async ({ page }, testInfo) => {
  const errors: string[] = [];
  const wasmPaths = new Set<string>();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== "http://127.0.0.1:4174") return;
    if (response.status() >= 400 && url.pathname !== "/favicon.ico") errors.push(`${response.status()} ${url.pathname}`);
    if (url.pathname.endsWith(".wasm") && response.ok()) wasmPaths.add(url.pathname);
  });
  await page.goto("/");
  await expect(page.locator(".terminal-version")).toHaveText(`v${version}`);
  await expect(page.locator('a[href*="app/"]').first()).toBeVisible();

  await page.goto("/app/?mode=easy");
  await expect(page.getByRole("heading", { name: "Erwartungshorizont erstellen", exact: true })).toBeVisible();
  const guide = page.getByRole("button", { name: "Einführung schließen" });
  if (await guide.isVisible()) await guide.click();
  await expect(page.getByText("Demo-Modus aktiv", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Leerer EWH", exact: false }).click();
  await page.getByRole("button", { name: "Abschnitt manuell ergänzen", exact: true }).click();
  await page.locator('textarea[placeholder="Stichpunkte oder mögliche Schülerantwort"]:visible').first().fill("Eigene Lösung im produktiven Pages-Arbeitsstand.");
  await expect(page.locator(".local-save-status")).toContainText("Lokal gespeichert");

  await page.goto("/demo/");
  await expect(page.getByText("Demo-Modus aktiv", { exact: true })).toBeVisible();
  if (await guide.isVisible()) await guide.click();
  await page.getByRole("button", { name: "EWH erstellen", exact: true }).first().click();
  await page.locator(".template-result-card").first().click();
  await page.locator(".composer-task-row").first().getByRole("button", { name: "Baustein bearbeiten", exact: true }).click();
  await expect(page.locator(".composer-task-row").first().getByRole("textbox", { name: "Eigene Bewertungskriterien", exact: true })).toHaveValue("");
  await page.screenshot({ path: testInfo.outputPath("pages-demo.png") });

  await page.goto("/app/?mode=easy");
  await page.getByRole("tab", { name: "Klassenarbeit korrigieren", exact: true }).click();
  await page.getByRole("tab", { name: "Überarbeiten", exact: true }).click();
  await page.locator(".section-editor").first().getByRole("button", { name: "Aufklappen", exact: true }).click();
  await expect(page.locator('textarea[placeholder="Stichpunkte oder mögliche Schülerantwort"]:visible').first()).toHaveValue("Eigene Lösung im produktiven Pages-Arbeitsstand.");
  expect([...wasmPaths].some((path) => path.startsWith("/app/assets/"))).toBe(true);
  expect([...wasmPaths].some((path) => path.startsWith("/demo/assets/"))).toBe(true);
  expect(errors).toEqual([]);
});
