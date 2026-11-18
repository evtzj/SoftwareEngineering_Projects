import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  webServer: {
    command: "node server.mjs",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 10000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 1000 },
    channel: "chrome",
  },
});
