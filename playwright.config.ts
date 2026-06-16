import { defineConfig, devices } from "@playwright/test";

// Smoke e2e: приложение поднимается с БД и ключевые публичные маршруты
// рендерятся без 500. Запускается в .github/workflows/e2e.yml.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
