import { defineConfig, devices } from '@playwright/test';

// Free ports outside the 47xx range: 5317 (full demo) and 5318 (demo without any source connected).
const server = (port: number, empty = false) => ({
  command: `node --conditions=stats-kit-source demo/server/start.ts`,
  url: `http://127.0.0.1:${port}/`,
  env: { PORT: String(port), ...(empty ? { DEMO_EMPTY: '1' } : {}) },
  reuseExistingServer: !process.env['CI'],
  timeout: 60_000,
});

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5317',
    // Installed Chrome (locally as on GitHub runners): no browser download.
    channel: 'chrome',
    locale: 'en-GB',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } }, testIgnore: /phone\.spec\.ts/ },
    { name: 'phone', use: { ...devices['Pixel 7'], channel: 'chrome' }, testMatch: /phone\.spec\.ts/ },
  ],
  webServer: [server(5317), server(5318, true)],
});
