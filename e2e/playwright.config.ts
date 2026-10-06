import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the demo build (`ng serve --configuration mock`), so they run
 * without the backend. Each test starts with fresh sample data (new browser context).
 */
const PORT = Number(process.env['E2E_PORT'] ?? 4300);

export default defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  fullyParallel: true,
  timeout: 60_000,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'report', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone-360',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } },
    },
  ],
  webServer: {
    command: `npx ng serve --configuration mock --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
