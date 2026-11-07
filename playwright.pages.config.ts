import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/pages",
  testMatch: "pages-deployment.spec.ts",
  workers: 2,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: "http://127.0.0.1:4174", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox", use: devices["Desktop Firefox"] },
  ],
  webServer: {
    command: "node scripts/serve-pages.mjs",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
