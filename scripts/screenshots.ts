// Screenshots of the demo (fake data) in screenshots/: Statistics page light, dark and on a phone, Google, YouTube, French and
// German pages, e-mail report. Starts the demo itself on a free port.  npm run demo:build && npm run screenshots
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { demoApp } from '../demo/server/start.ts';

const out = new URL('../screenshots/', import.meta.url);
const file = (name: string) => new URL(name, out).pathname.replace(/^\/(\w:)/, '$1');
mkdirSync(out, { recursive: true });
const server = (await demoApp()).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const browser = await chromium.launch({ channel: 'chrome' });
const shots: [string, string, number, number, boolean][] = [
  ['statistics-light.png', '/?theme=light', 1440, 900, true],
  ['statistics-dark.png', '/?theme=dark', 1440, 900, false],
  ['statistics-phone.png', '/?theme=light', 390, 844, true],
  ['google.png', '/?theme=light#google', 1440, 900, true],
  ['youtube-dark.png', '/?theme=dark#youtube', 1440, 900, true],
  ['statistics-french.png', '/?theme=light&lang=fr', 1280, 800, false],
  ['statistics-german.png', '/?theme=light&lang=de', 1280, 800, false],
];
for (const [name, path, width, height, full] of shots) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: width < 500 ? 2 : 1, locale: 'en-GB', timezoneId: 'Europe/Paris' });
  await page.goto(base + path);
  await page.waitForSelector('sk-world-map path.sk-map__on, .sk-channel, sk-tile', { timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: file(name), fullPage: full });
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 820, height: 900 } });
const preview = await (await fetch(`${base}/api/admin/audience/report/preview?days=7`)).json();
await page.setContent(preview.html);
await page.waitForTimeout(300);
await page.screenshot({ path: file('report.png'), fullPage: true });
await browser.close();
server.close();
console.log('Screenshots written to screenshots/');
