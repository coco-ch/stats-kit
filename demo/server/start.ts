/*
 * Demo server: serves the built application (dist/demo/browser) and mounts the library routes on fake services. Nothing leaves
 * the machine; "sending" the report is only logged.
 *   PORT (5317 by default), DEMO_EMPTY=1: no source connected ("not configured" states),
 *   DEMO_BASE=/console/: the whole administration served under a sub-path (as behind a reverse proxy), `<base href>` included.
 * Two sites: "Example Workshop" (`api/admin/audience`, the address of provideStatsKit) and "Example Shop" (`api/admin/shop`),
 * chosen with the site selector of the demo, which changes the `apiUrl` input of the pages.
 */
import express from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createStatsKit, type StatsKitConfig } from 'stats-kit/server';
import { fakeFetch, fakeSources } from '../fake/services.ts';

const port = Number(process.env['PORT'] || 5317);
const empty = process.env['DEMO_EMPTY'] === '1';
/** Sub-path of the administration ("/" or "/console/"). */
const base = `/${(process.env['DEMO_BASE'] ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
const browser = fileURLToPath(new URL('../../dist/demo/browser/', import.meta.url));

/** "Sent" messages (read by the end-to-end tests). */
const outbox: { subject: string; at: string; attachments: number }[] = [];

/** The fictitious site's own data (its database): requests received through its form. */
const extras: StatsKitConfig['extras'] = async (range) => {
  const days = range.days;
  const total = Math.round(days * 1.4), before = Math.round(days * 1.25);
  return {
    tiles: [
      { id: 'requests', label: 'Requests received', value: total, previous: before, sub: 'through the site form', group: null, highlight: false },
      { id: 'to-handle', label: 'To handle', value: 3, previous: null, sub: 'all periods', group: null, highlight: true, link: { url: '#requests', label: 'Open the requests' } },
    ],
    tables: [{ id: 'subjects', title: 'Requests received by subject', sub: null, head: 'Subject', column: 'Requests', section: 'actions', items: [
      { key: 'quote', label: 'Quote request', value: Math.round(total * 0.5), previous: Math.round(before * 0.45) },
      { key: 'visit', label: 'Workshop visit', value: Math.round(total * 0.3), previous: Math.round(before * 0.35) },
      { key: 'other', label: 'Other question', value: Math.round(total * 0.2), previous: Math.round(before * 0.2) },
    ] }],
    funnel: { label: 'Requests received', value: total },
  };
};

export async function demoApp() {
  const sources = empty ? { umami: null, gsc: null, youtube: null } : await fakeSources();
  const kit = createStatsKit({
    siteName: 'Example Workshop',
    timeZone: 'Europe/Paris',
    ...sources,
    fetch: fakeFetch(),
    pages: {
      languages: ['en', 'fr', 'de'],
      labels: { '/': 'Home', '/services': 'Services', '/contact': 'Contact', '/about': 'About', '/pricing': 'Pricing', '/projects': 'Projects' },
      groups: [
        { id: 'products', title: 'Most viewed product pages', pattern: /^\/products\/([a-z0-9-]+)$/, labels: { 'oak-table': 'Oak table', 'walnut-chair': 'Walnut chair', 'ash-shelf': 'Ash shelf' } },
        { id: 'articles', title: 'Most read articles', pattern: /^\/articles\/([a-z0-9-]+)$/ },
      ],
    },
    events: { labels: { 'phone-click': 'Click to call', 'form-sent': 'Form sent', 'email-click': 'Click on the e-mail address', 'catalogue-download': 'Catalogue downloaded', 'directions-click': 'Directions requested', 'video-play': 'Video started' } },
    goals: [
      { id: 'calls', label: 'Clicks to call', events: ['phone-click'] },
      { id: 'forms', label: 'Forms sent', events: ['form-sent'] },
    ],
    extras,
    sourceRequests: async (from, to) => {
      const days = Math.max(1, Math.round((to - from) / 86_400_000));
      return { total: Math.round(days / 9), bySubject: [{ key: 'quote', label: 'Quote request', value: Math.round(days / 14), previous: null }, { key: 'visit', label: 'Workshop visit', value: Math.round(days / 25), previous: null }] };
    },
    report: {
      theme: { brand: '#1d3c9c' },
      statsUrl: `http://localhost:${port}/#statistics`,
      send: async (m) => {
        outbox.push({ subject: m.subject, at: new Date().toISOString(), attachments: m.attachments.length });
        console.log(`[demo] report "${m.subject}" ready (${m.attachments.length} image(s)): nothing is sent.`);
        return 2;
      },
    },
  });

  // second site: same sources, no site data nor goals (its pages differ from the first one)
  const shop = createStatsKit({ siteName: 'Example Shop', timeZone: 'Europe/Paris', ...sources, fetch: fakeFetch() });

  const site = express.Router();
  site.get('/api/demo/outbox', (_req, res) => res.json(outbox));
  site.use('/api/admin/audience', kit.middleware());
  site.use('/api/admin/shop', shop.middleware());
  if (existsSync(browser)) {
    const index = readFileSync(`${browser}index.html`, 'utf8').replace('<base href="/">', `<base href="${base}">`);
    const page = (_req: express.Request, res: express.Response) => void res.type('html').send(index);
    site.get(['/', '/index.html'], page);
    site.use(express.static(browser, { index: false }));
    site.get(/^\/(?!api\/).*/, page);
  }
  const app = express();
  app.disable('x-powered-by');
  app.use(base, site);
  return app;
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('start.ts')) {
  const app = await demoApp();
  app.listen(port, '127.0.0.1', () => console.log(`stats-kit demo on http://localhost:${port}${base}${existsSync(browser) ? '' : ' (application not built: npm run demo:build)'}`));
}
