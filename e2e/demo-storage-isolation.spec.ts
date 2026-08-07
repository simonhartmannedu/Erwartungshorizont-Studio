import { expect, test } from "@playwright/test";

test("keeps sample data out of the productive workspace", async ({ page }) => {
  await page.goto("/?demo=1&freshDemo=1");
  await expect(page.getByText("Demo-Modus aktiv")).toBeVisible();
  const demoWorkspace = page.getByRole("button", { name: "Englisch-Klassenarbeit Unit 5", exact: true });
  await expect(demoWorkspace).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Erwartungshorizont Studio" })).toBeVisible();
  await expect(page.getByText("Demo-Modus aktiv")).not.toBeVisible();
  await expect(demoWorkspace).not.toBeVisible();
});
