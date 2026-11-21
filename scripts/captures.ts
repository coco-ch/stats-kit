// Captures de la démo (données factices) dans captures/ : page Statistiques claire, sombre et au téléphone, Google, YouTube,
// rapport par e-mail. Lance lui-même la démo sur un port libre.  npm run demo:build && npm run captures
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { demoApp } from '../demo/serveur/demarrer.ts';

const out = new URL('../captures/', import.meta.url);
mkdirSync(out, { recursive: true });
const server = (await demoApp()).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const browser = await chromium.launch({ channel: 'chrome' });
const shots: [string, string, number, number, boolean][] = [
  ['statistiques-clair.png', '/?theme=light', 1440, 900, true],
  ['statistiques-sombre.png', '/?theme=dark', 1440, 900, false],
  ['statistiques-telephone.png', '/?theme=light', 390, 844, true],
  ['google.png', '/?theme=light#google', 1440, 900, true],
  ['youtube-sombre.png', '/?theme=dark#youtube', 1440, 900, true],
  ['statistiques-anglais.png', '/?theme=light&lang=en', 1280, 800, false],
];
for (const [name, path, width, height, full] of shots) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: width < 500 ? 2 : 1, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await page.goto(base + path);
  await page.waitForSelector('sk-world-map path.sk-map__on, .sk-channel, sk-tile', { timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: new URL(name, out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: full });
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 820, height: 900 } });
const preview = await (await fetch(`${base}/api/admin/audience/report/preview?days=7`)).json();
await page.setContent(preview.html);
await page.waitForTimeout(300);
await page.screenshot({ path: new URL('rapport.png', out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
await browser.close();
server.close();
console.log('Captures écrites dans captures/');
