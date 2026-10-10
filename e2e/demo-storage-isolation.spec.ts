import { expect, test } from "@playwright/test";

test("keeps sample data out of the productive workspace", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  // Parallel CI workers may still be compiling SQLite's WebAssembly module after
  // navigation. Wait for the mode marker rather than treating slow startup as a
  // missing demo workspace.
  await expect(page.getByText("Demo-Modus aktiv")).toBeVisible({ timeout: 20_000 });
  const demoWorkspace = page.getByRole("button", { name: "Englisch-Klassenarbeit Unit 5", exact: true });
  await expect(demoWorkspace).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Erwartungshorizont Studio" })).toBeVisible();
  await expect(page.getByText("Demo-Modus aktiv")).not.toBeVisible();
  await expect(demoWorkspace).not.toBeVisible();
});
