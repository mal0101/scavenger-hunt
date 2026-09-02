import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PW_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./specs",
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "player-mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        permissions: ["camera", "geolocation"],
      },
    },
    {
      name: "mentor-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
      testMatch: /(mentor|security|pwa)\.spec\.ts/,
    },
  ],
});
