// Contract fixtures of the .NET server: the Node server answers a series of requests on simulated data (the fake Umami of the
// demo, fixed date), and every call it makes to Umami is recorded with its answer. The .NET tests replay the same calls
// (packages/dotnet/test/StatsKit.Server.Tests/Golden) and check that the .NET server asks Umami the same questions and gives
// the same answers: same JSON, same report (HTML, text, subject) in every language, same map pixels.
//   node --conditions=stats-kit-source scripts/dotnet-golden.ts            → writes the fixtures
//   node --conditions=stats-kit-source scripts/dotnet-golden.ts --check    → fails if they are out of date (CI)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { LOCALES, countryName, createTexts, formatMoney, mergeLanguages, pathOf, formatDuration, formatNumber, formatPercent, hourName, languageName, longDay, shortDate, slotLabel, weekdayName, type Extras } from 'stats-kit/contract';
import { createStatsKit, reportDue, youtubeClient, type Fetch, type KitResponse, type StatsKitConfig, type WeeklySchedule } from 'stats-kit/server';
import { FAKE, fakeFetch, fakeSources } from '../demo/fake/services.ts';

const NOW = Date.parse('2026-11-16T10:30:00Z');
const dir = new URL('../packages/dotnet/test/StatsKit.Server.Tests/Golden/', import.meta.url);

/** Raw pixels of a PNG written by the library (8-bit RGB or RGBA, filter 0 on every row): hash and size. */
export function pngPixels(png: Buffer): string {
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20), bpp = png[25] === 6 ? 4 : 3;
  const idat: Buffer[] = [];
  for (let i = 8; i < png.length;) {
    const len = png.readUInt32BE(i), type = png.toString('ascii', i + 4, i + 8);
    if (type === 'IDAT') idat.push(png.subarray(i + 8, i + 8 + len));
    i += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rgb = Buffer.alloc(width * height * bpp);
  for (let y = 0; y < height; y++) raw.copy(rgb, y * width * bpp, y * (width * bpp + 1) + 1, (y + 1) * (width * bpp + 1));
  return `${width}x${height}:${createHash('sha256').update(rgb).digest('hex')}`;
}

/** Inline images replaced by the hash of their pixels: compression may differ between platforms, the image may not. */
const normalizeImages = (html: string) => html.replace(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g, (_, b64: string) => `data:image/png;pixels,${pngPixels(Buffer.from(b64, 'base64'))}`);

/** Address with sorted parameters: the key of a recorded call. */
const callKey = (url: string, init?: RequestInit) => {
  const u = new URL(url);
  const params = [...u.searchParams].sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0));
  const q = new URLSearchParams(params).toString();
  return `${(init?.method ?? 'GET').toUpperCase()} ${u.origin}${u.pathname}${q ? `?${q}` : ''}`;
};

interface Call { status: number; body: string }

function recorder(base: Fetch) {
  const calls: Record<string, Call> = {};
  const fetch: Fetch = async (url, init) => {
    const r = await base(url, init);
    const body = await r.text();
    calls[callKey(url, init)] = { status: r.status, body };
    return new Response(body, { status: r.status, headers: r.headers });
  };
  return { fetch, calls };
}

const extras: Extras = {
  tiles: [
    { id: 'usage', label: 'AI usage (7 d)', value: 12.5, previous: 10, sub: null, group: 'Costs', highlight: false },
    { id: 'subscriptions', label: 'Subscriptions / month', value: '30.00 EUR', previous: null, sub: 'Recurring costs', group: 'Costs', highlight: false },
    { id: 'pending', label: 'Requests to handle', value: 3, previous: null, sub: 'since Monday', group: null, highlight: true },
  ],
  tables: [{ id: 'providers', title: 'AI usage by provider', sub: 'Over the period', head: 'Provider', column: 'Cost', section: 'actions', items: [{ key: 'anthropic', label: 'Anthropic', value: 9.25, previous: null }, { key: 'openai', label: 'OpenAI', value: 3.25, previous: null }] }],
  funnel: { label: 'Requests received', value: 12 },
};

const umami = { url: FAKE.umami, websiteId: FAKE.websiteId, username: FAKE.username, password: FAKE.password };
const full = (locale: string, fetch: Fetch): StatsKitConfig => ({
  siteName: 'Example Workshop', timeZone: 'Europe/Paris', locale, umami, fetch, now: () => NOW,
  pages: { languages: ['en', 'fr', 'de'], labels: { '/': 'Home', '/contact': 'Contact' }, groups: [{ id: 'products', title: 'Product pages', pattern: /^\/products\/([a-z0-9-]+)$/ }] },
  events: { labels: { 'phone-click': 'Click to call' } },
  goals: [{ id: 'calls', label: 'Clicks to call', events: ['phone-click'] }],
  extras: async () => extras,
  report: { theme: { brand: '#b87333', head: '#1a1a1d', display: 'Georgia,serif', map: { land: '#e4ded3' }, dark: { accent: '#e0a46b' } }, statsUrl: 'https://www.example.test/admin/statistics', send: async () => 2,
    searchUrl: 'https://www.example.test/admin/google', youtubeUrl: 'https://www.example.test/admin/youtube',
    blocks: async () => [
      { title: 'Costs', hint: 'Over the period', figures: [{ value: '12.50 EUR', label: 'AI usage', sub: '7 days' }, { value: '30.00 EUR', label: 'Subscriptions / month' }, { value: '3', label: 'Invoices' }, { value: '1', label: 'Alerts', sub: 'to check' }], lines: ['Anthropic: 9.25 EUR', 'OpenAI: 3.25 EUR'] },
      { title: 'News', lines: ['Concert on Saturday "Brass & Winds" <live>'] },
    ] },
});

type Req = { method: string; path: string; query: Record<string, string> };
const get = (path: string, query: Record<string, string> = {}): Req => ({ method: 'GET', path, query });

/** Search Console and YouTube connected (the .NET server is given their figures: Golden/<name>.json, "sources", by days). */
const fakeSrc = await fakeSources();
const withSources = (c: StatsKitConfig): StatsKitConfig => ({ ...c, gsc: fakeSrc.gsc, youtube: fakeSrc.youtube, sourceRequests: async () => ({ total: 2, bySubject: [] }) });

async function scenario(name: string, config: (fetch: Fetch) => StatsKitConfig, requests: Req[], base: Fetch = fakeFetch({ now: () => NOW }), sourceDays: number[] = []) {
  const rec = recorder(base);
  const kit = createStatsKit(config(rec.fetch));
  const answers: unknown[] = [];
  for (const req of requests) {
    const r: KitResponse = await kit.handle(req);
    const json = (r.headers['Content-Type'] ?? '').startsWith('application/json');
    let body: unknown = r.body;
    if (req.path === '/world.json' && r.status === 200) body = `sha256:${createHash('sha256').update(r.body).digest('hex')}`;
    else if (json) {
      const parsed = JSON.parse(r.body) as Record<string, unknown>;
      if (typeof parsed['html'] === 'string') parsed['html'] = normalizeImages(parsed['html']);
      body = parsed;
    }
    answers.push({ request: req, status: r.status, headers: r.headers, body });
  }
  if (!sourceDays.length) return [name, { now: new Date(NOW).toISOString(), answers, calls: rec.calls }] as const;
  // what the report took from Google and YouTube, for the .NET server; the calls it made to them (and to Umami for the YouTube
  // visits) are not replayed there
  const plain = createStatsKit(config(fakeFetch({ now: () => NOW })));
  const yt = youtubeClient(fakeSrc.youtube, fakeFetch({ now: () => NOW }));
  const sources: Record<string, unknown> = {};
  for (const days of sourceDays) {
    const search = await plain.search({ days });
    const youtube = await plain.youtube(Math.min(90, days));
    const videos = youtube.status === 'ok' && youtube.totals.views ? await yt.topVideos(youtube.start, youtube.end, 3, NOW) : [];
    sources[String(days)] = { search, youtube, videos };
  }
  const calls = Object.fromEntries(Object.entries(rec.calls).filter(([k]) => k.includes(` ${FAKE.umami}/`) && !/[?&](query|referrer)=/.test(k)));
  return [name, { now: new Date(NOW).toISOString(), answers, calls, sources }] as const;
}

const files: (readonly [string, unknown])[] = [];
files.push(await scenario('full-en', (f) => full('en', f), [
  get('/overview', { days: '30' }), get('/overview', { days: '1' }), get('/overview', { days: '7' }), get('/overview', { from: '2026-10-01', to: '2026-10-31' }),
  get('/overview', { days: 'abc' }), get('/', {}), get('/overview/', { days: '90' }), get('/live'), get('/search'), get('/search/indexation'), get('/youtube'),
  get('/report/preview', { days: '7' }), get('/report/preview', { days: '1' }), { method: 'POST', path: '/report/send', query: { days: '7' } }, get('/world.json'),
  get('/unknown'), { method: 'DELETE', path: '/overview', query: {} },
]));
// every language with Google and YouTube; the English report with them too, and texts read at the report
for (const code of Object.keys(LOCALES).filter((c) => c !== 'en')) files.push(await scenario(`full-${code}`, (f) => withSources(full(code, f)), [get('/report/preview', { days: '30' })], undefined, [30]));
files.push(await scenario('sources-en', (f) => { const c = withSources(full('en', f)); return { ...c, report: { ...c.report, texts: () => ({ report: { footer: 'Footer read at every report' } }) } }; },
  [get('/report/preview', { days: '7' }), get('/report/preview', { days: '30' })], undefined, [7, 30]));
files.push(await scenario('no-glance', (f) => { const c = full('en', f); return { ...c, report: { ...c.report, glance: false, blocks: () => { throw new Error('no blocks'); } } }; }, [get('/report/preview', { days: '7' })]));
files.push(await scenario('regional-fr-CH', (f) => full('fr-CH', f), [get('/report/preview', { days: '7' })]));
files.push(await scenario('not-configured', (f) => ({ siteName: 'Empty site', fetch: f, now: () => NOW, world: null }), [
  get('/overview', { days: '7' }), get('/live'), get('/report/preview'), { method: 'POST', path: '/report/send', query: {} }, get('/world.json'),
]));
const failing: Fetch = async (url, init) => (url.includes('/stats?') ? new Response('database unavailable', { status: 500 }) : fakeFetch({ now: () => NOW })(url, init));
files.push(await scenario('umami-error', (f) => ({ ...full('fr', f), report: { send: async () => { throw new Error('mailbox full'); } } }), [
  get('/overview', { days: '30' }), get('/report/preview', { days: '7' }), { method: 'POST', path: '/report/send', query: {} },
], failing));
const refused: Fetch = async (url, init) => (url.endsWith('/auth/login') ? new Response('', { status: 401 }) : fakeFetch({ now: () => NOW })(url, init));
files.push(await scenario('umami-login-refused', (f) => ({ siteName: 'Refused', fetch: f, now: () => NOW, umami, timeZone: 'UTC' }), [get('/overview', { days: '7' }), get('/live')], refused));

// Formats: the .NET server rebuilds them from the Intl snapshot; these samples check it gives the same strings.
const world = JSON.parse(readFileSync(new URL('../packages/server/assets/world-110m.json', import.meta.url), 'utf8')) as { features: { properties: { iso2: string } }[] };
const days2026 = Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
const instants = ['2026-03-28T22:30:00.000Z', '2026-03-29T00:59:59.000Z', '2026-03-29T01:00:00.000Z', '2026-10-24T22:00:00.000Z', '2026-10-25T00:30:00.000Z', '2026-12-31T23:00:00.000Z', '2026-11-16T10:30:00.000Z'];
const formats: Record<string, unknown> = {};
for (const tag of [...Object.values(LOCALES).map((t) => t.locale), 'fr-CH', 'en-US', 'de-CH', 'pt-BR', 'es-MX']) {
  const texts = createTexts(tag);
  const numbers = [0, 1, -1, 5, 12, 999, 1000, 1234, 12345, 123456, 1234567, 0.5, 1.5, 2.5, -0.4, -2.5, 12.345, 1.005, 0.125, 99999.95, 2.675, 1e9];
  const rates = [0, 0.001, 0.005, 0.0049, 0.12, 0.125, 0.5, 1, 1.5, 12.34, -0.1, -0.005, 1 / 3, 0.145, 0.285];
  formats[tag] = {
    locale: texts.locale,
    number: numbers.flatMap((v) => [0, 1, 2].flatMap((d) => [false, true].map((s) => [v, d, s, formatNumber(texts, v, d, s)]))),
    percent: rates.flatMap((v) => [0, 1].flatMap((d) => [false, true].map((s) => [v, d, s, formatPercent(texts, v, d, s)]))),
    duration: [0, 0.4, 0.5, 1, 2, 3, 5, 11, 21, 22, 59, 59.5, 60, 61, 62, 119, 120, 121, 125, 600, 1260, 3599, 3600, 3725, 7322, 100000, 60_000_000].map((s) => [s, formatDuration(texts, s)]),
    dm: days2026.map((d) => [d, shortDate(texts, d)]),
    dmy: days2026.filter((_, i) => i % 29 === 0).map((d) => [d, shortDate(texts, d, 'UTC', true)]),
    instants: instants.map((d) => [d, shortDate(texts, d, 'Europe/Paris'), shortDate(texts, d, 'America/New_York', true)]),
    longDay: days2026.map((d) => [d, longDay(texts, d)]),
    slotLong: days2026.filter((_, i) => i % 7 === 0).map((d) => [d, slotLabel(texts, d, 'day', true)]),
    hours: Array.from({ length: 24 }, (_, h) => hourName(texts, h)),
    weekdays: Array.from({ length: 7 }, (_, d) => [weekdayName(texts, d), weekdayName(texts, d, 'short')]),
    countries: [...new Set([...world.features.map((f) => f.properties.iso2), 'FRA', 'che', 'XK', 'ZZ', ''])].map((c) => [c, countryName(texts, c)]),
    languages: ['fr', 'fr-FR', 'fr-fr', 'en-US', 'en-GB', 'en', 'de-CH', 'de-AT', 'pt-BR', 'pt-PT', 'zh-Hans', 'zh-CN', 'zh-TW', 'sr-Latn', 'nb-NO', 'ja-JP', 'ko-KR', 'ru-RU', 'it-CH', 'xx', 'xx-FR', ''].map((c) => [c, languageName(texts, c)]),
    money: ['EUR', 'USD', 'CHF', 'GBP', 'JPY', 'KRW', 'xyz', ''].flatMap((code) => [0, 1, 12.5, 30, 99.999, 1490, 12345.678, -3.256, 0.004, 2.675, 1234567.891].map((v) => [v, code, formatMoney(texts, v, code)])),
    mergedLanguages: mergeLanguages([{ key: 'fr-FR', label: null, value: 5, previous: 4 }, { key: 'en_US', label: null, value: 3, previous: 1 }, { key: 'fr', label: null, value: 2, previous: null }, { key: 'EN', label: null, value: 3, previous: 2 }, { key: 'de', label: null, value: 6, previous: 0 }, { key: 'ca', label: null, value: 6, previous: 0 }]),
    paths: ['https://www.example.test/en/contact', 'https://www.example.test/', 'https://www.example.test/a?b=1', 'not a url', '/relative'].map((u) => [u, pathOf(u)]),
    upper: ['Straße', 'éclair à la crème', 'Größte Seiten', 'страницы', 'pages vues'].map((s) => [s, s.toLocaleUpperCase(texts.locale)]),
  };
}
const keys = ['/', '/contact', '/Contact', '/about', '/a-b', '/a_b', '/a.b', '/a1', '/A1', '/a b', 'é', 'e', 'E', 'f', 'Zebra', 'apple', '(direct)', '', 'google.com', 'www.google.com', 'bing.com',
  'Paris', 'paris', 'Antibes', 'Évian', 'Zürich', 'Zurich', '/en/x', '/fr', 'x-y', 'x y', 'phone-click', 'phone_click', '123', '12', '1-2', '/produits/table-chêne', 'Nice', 'nice', 'Cannes', 'Москва', '東京', 'Ölberg', 'Oz'];
files.push(['formats', { formats, sorted: [...keys].sort((a, b) => a.localeCompare(b)) }]);

// Weekly schedule: the week due (or null) every 30 minutes over three weeks, for several schedules and last weeks sent.
const schedules: WeeklySchedule[] = [
  { weekday: 1, hour: 8, timeZone: 'Europe/Paris' }, { weekday: 1, hour: 8, timeZone: 'Europe/Paris', catchUpDays: 1 },
  { weekday: 1, hour: 8, timeZone: 'Europe/Paris', catchUpDays: 7 }, { weekday: 5, hour: 18, timeZone: 'America/New_York', catchUpDays: 2 },
  { weekday: 7, hour: 0, timeZone: 'UTC' }, { weekday: 3, hour: 23, timeZone: 'Asia/Tokyo', catchUpDays: 0 },
];
const due: unknown[] = [];
for (const s of schedules) for (const last of [null, '2026-W47', '2026-W48']) {
  const rows: (string | null)[] = [];
  for (let t = Date.parse('2026-11-15T00:00:00Z'); t < Date.parse('2026-12-06T00:00:00Z'); t += 1_800_000) rows.push(reportDue(t, last, s));
  due.push({ schedule: s, lastSent: last, from: '2026-11-15T00:00:00.000Z', stepMinutes: 30, due: rows });
}
files.push(['schedule', { due }]);

const check = process.argv.includes('--check');
mkdirSync(dir, { recursive: true });
let stale = false;
for (const [name, data] of files) {
  const file = new URL(`${name}.json`, dir);
  const text = JSON.stringify(data, null, 1) + '\n';
  if (check) {
    let current = '';
    try { current = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'); } catch { /* missing */ }
    if (current !== text) { console.error(`Golden/${name}.json is out of date: run "npm run dotnet:golden".`); stale = true; }
  } else writeFileSync(file, text);
}
if (stale) process.exit(1);
console.log(check ? '.NET contract fixtures up to date.' : `${files.length} contract fixtures written.`);
