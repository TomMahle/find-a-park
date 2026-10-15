import { defineConfig, devices } from "@playwright/test";

// A different port from `pnpm dev` (3000) so tests never reuse a dev server.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Every test runs on both projects unless tagged for one layout: @desktop
  // (list and map side by side) or @phone (List/Map toggle). Filtering here,
  // rather than skipping inside tests, keeps reports free of "skipped" noise.
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: /@phone/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      grepInvert: /@desktop/,
    },
  ],
  webServer: {
    // Tests run against a production build, which is what residents get.
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
