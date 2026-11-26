// Previews of the e-mail report on the fake services (fixed date), as images: computer and phone widths, light and dark mode,
// in the chosen languages. Used for the README screenshots and to check the layout by eye.
//   node --conditions=stats-kit-source scripts/report-previews.ts [out-dir] [lang,lang…]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createStatsKit, previewHtml, type StatsKitConfig } from 'stats-kit/server';
import { formatMoney, createTexts } from 'stats-kit/contract';
import { fakeFetch, fakeSources } from '../demo/fake/services.ts';

const NOW = Date.parse('2026-11-16T10:30:00Z');
const out = resolve(process.argv[2] ?? 'screenshots/report');
const langs = (process.argv[3] ?? 'en,fr').split(',');
mkdirSync(out, { recursive: true });

async function demoReport(locale: string) {
  const texts = createTexts(locale);
  const money = (n: number) => formatMoney(texts, n, 'USD');
  const config: StatsKitConfig = {
    siteName: 'Example Workshop', timeZone: 'Europe/Paris', locale, ...(await fakeSources()), fetch: fakeFetch({ now: () => NOW }), now: () => NOW,
    pages: { languages: ['en', 'fr', 'de'], labels: { '/': 'Home', '/services': 'Services', '/contact': 'Contact', '/about': 'About' }, groups: [{ id: 'products', title: 'Product pages', pattern: /^\/products\/([a-z0-9-]+)$/ }] },
    events: { labels: { 'phone-click': 'Click to call', 'form-sent': 'Form sent' } },
    goals: [{ id: 'calls', label: 'Clicks to call', events: ['phone-click'] }, { id: 'forms', label: 'Forms sent', events: ['form-sent'] }],
    report: {
      theme: { brand: '#1d3c9c' }, statsUrl: 'https://www.example.test/admin/statistics', searchUrl: 'https://www.example.test/admin/google', youtubeUrl: 'https://www.example.test/admin/youtube',
      // the site's own figures at the top (labels given by the site, in its language)
      business: () => {
        const fr = locale.startsWith('fr');
        return {
          hint: fr ? 'D’après la base du site, sur la même période' : null,
          kpis: [
            { id: 'requests', label: fr ? 'Demandes de devis reçues' : 'Quote requests received', value: 5, previous: 2, group: fr ? 'Demandes' : 'Requests', series: [0, 1, 0, 2, 1, 0, 1] },
            { id: 'to-handle', label: fr ? 'À traiter' : 'To handle', value: 2, highlight: true, group: fr ? 'Demandes' : 'Requests', sub: fr ? 'la plus ancienne : 3 jours' : 'oldest: 3 days', link: { url: 'https://www.example.test/admin/requests', label: fr ? 'Ouvrir →' : 'Open →' } },
            { id: 'customers', label: fr ? 'Clients' : 'Customers', value: 12, group: fr ? 'Clients' : 'Customers', sub: fr ? 'dont 3 en essai' : '3 in trial' },
            { id: 'revenue', label: fr ? 'Revenu mensuel' : 'Monthly revenue', value: 1490, previous: 1290, currency: 'EUR', group: fr ? 'Clients' : 'Customers' },
          ],
          status: { tone: 'warn', title: fr ? 'Un point demande votre attention' : 'One point needs your attention', lines: [fr ? 'Sauvegarde en retard d’un jour' : 'Backup one day late'] },
        };
      },
      blocks: () => [{ title: 'Costs', hint: 'AI services and subscriptions', figures: [{ value: money(12.5), label: 'AI usage (7 d)' }, { value: money(30), label: 'Subscriptions / month' }, { value: money(1490), label: 'Hosting / year' }], lines: [`Anthropic: ${money(9.25)}`, `OpenAI: ${money(3.25)}`] }],
    },
  };
  const kit = createStatsKit(config);
  return kit.report({ days: '7' }, true);
}

const browser = await chromium.launch({ channel: 'chrome' });
for (const lang of langs) {
  const m = await demoReport(lang);
  const html = previewHtml(m);
  writeFileSync(resolve(out, `report-${lang}.html`), html);
  writeFileSync(resolve(out, `report-${lang}.txt`), `${m.subject}\n\n${m.text}`);
  for (const [device, width] of [['desktop', 820], ['phone', 375]] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: device === 'phone' ? 2 : 1, colorScheme: scheme });
      await page.setContent(html);
      await page.waitForTimeout(200);
      await page.screenshot({ path: resolve(out, `report-${lang}-${device}-${scheme}.png`), fullPage: true });
      await page.close();
    }
  }
  console.log(`${lang}: ${m.subject} — ${Math.round(m.html.length / 1024)} KB of HTML, ${m.attachments.length} images`);
}
await browser.close();
