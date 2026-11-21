import { defineConfig, devices } from '@playwright/test';

// Ports libres hors de la plage 47xx : 5317 (démo complète) et 5318 (démo sans aucune source branchée).
const server = (port: number, extra = '') => ({
  command: `node --conditions=stats-kit-source demo/serveur/demarrer.ts`,
  url: `http://127.0.0.1:${port}/`,
  env: { PORT: String(port), ...(extra ? { DEMO_VIDE: '1' } : {}) },
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
    // Chrome installé (en local comme sur les exécuteurs GitHub) : pas de téléchargement de navigateur.
    channel: 'chrome',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'bureau', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } }, testIgnore: /telephone\.spec\.ts/ },
    { name: 'telephone', use: { ...devices['Pixel 7'], channel: 'chrome' }, testMatch: /telephone\.spec\.ts/ },
  ],
  webServer: [server(5317), server(5318, 'vide')],
});
