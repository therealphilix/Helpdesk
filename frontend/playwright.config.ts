import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["html", { open: "never" }], ["list"]],

  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: [
    {
      command:
        'cmd /c "cd /d ..\\backend && set DATABASE_URL=postgresql+asyncpg://helpdesk:helpdesk@localhost:5432/helpdesk_test && set ENVIRONMENT=testing && set SECRET_KEY=test-secret-key-for-e2e-testing-only && set REDIS_URL=redis://localhost:6379/1 && set CORS_ORIGINS=http://localhost:5173 && set PYTHONIOENCODING=utf-8 && fastapi dev app/main.py"',
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "bun run dev",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})
