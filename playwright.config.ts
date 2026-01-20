import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['blob'], ['list']] : [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Pass through environment variables to the web server
    // In CI, enable test endpoints for E2E testing
    ...(process.env.CI && {
      env: {
        ...process.env as Record<string, string>,
        ALLOW_TEST_ENDPOINTS: 'true',
      },
    }),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile Safari has cookie handling differences that cause auth fixture issues
    // Run explicitly with: npx playwright test --project="Mobile Safari"
    ...(process.env.TEST_ALL_BROWSERS ? [{
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    }] : []),
  ],
})
