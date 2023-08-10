import type { PlaywrightTestConfig } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

// See https://playwright.dev/docs/test-configuration.
const config: PlaywrightTestConfig = {
  testDir: "./tests",
  // Maximum time one test can run for.
  timeout: 30 * 1000,
  expect: {
    // Maximum time expect() should wait for the condition to be met.
    // For example in `await expect(locator).toHaveText();`
    timeout: 5000,
  },
  // Run tests in files in parallel
  fullyParallel: true,
  use: {
    baseURL: BASE_URL,
  },
  webServer: {
    command: "npm run start",
    url: BASE_URL,
  },
};

export default config;
