/*
 * Fake Umami, fake Search Console and fake YouTube, entirely fictitious and deterministic: a replacement `fetch` that answers
 * the *.example.test addresses. It serves the server tests, the demo and the end-to-end tests (no external call).
 * Traffic is computed hour by hour: totals, series and rankings stay consistent with each other and from one period to another.
 */

export const FAKE = {
  umami: 'https://umami.example.test',
  google: 'https://google.example.test',
  youtube: 'https://youtube.example.test',
  site: 'https://www.example.test',
  websiteId: 'site-demo',
  username: 'reader',
  password: 'demo-password',
  umamiToken: 'demo-umami-token',
  googleToken: 'demo-google-token',
  channelId: 'UCdemo0000000000000000000',
} as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Stable pseudo-random number (0 to 1) for a key. */
function noise(key: number | string): number {
  let h = 2166136261;
  for (const c of String(key)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** Wall-clock time in Paris (fixed +1 h approximation, enough for the demo). */
const local = (t: number) => new Date(t + HOUR);

/** Page views of an hour (start instant, aligned on the hour). */
export function hourViews(t: number): number {
  const d = local(t);
  const h = d.getUTCHours();
  const wd = (d.getUTCDay() + 6) % 7;
  const daily = [0.2, 0.1, 0.1, 0.1, 0.1, 0.2, 0.5, 1.2, 2.2, 3.0, 3.2, 2.9, 2.2, 2.6, 3.1, 3.0, 2.8, 2.4, 2.0, 2.2, 2.1, 1.6, 0.9, 0.4][h];
  const week = [1.15, 1.1, 1.05, 1.0, 0.95, 0.6, 0.5][wd];
  const trend = 1 + Math.sin(t / (11 * DAY)) * 0.18 + (t / DAY - 20000) * 0.0008;
  return Math.max(0, Math.round(daily * week * trend * 2.1 + noise(t) * 2.2 - 0.6));
}

interface Totals { pageviews: number; visitors: number; visits: number; bounces: number; totaltime: number }
function totals(from: number, to: number, scale = 1): Totals {
  let pv = 0;
  for (let t = Math.floor(from / HOUR) * HOUR; t < to; t += HOUR) pv += hourViews(t);
  pv = Math.round(pv * scale);
  const visits = Math.round(pv * 0.56);
  return { pageviews: pv, visitors: Math.round(pv * 0.43), visits, bounces: Math.round(visits * 0.41), totaltime: visits * 96 };
}

const PATHS: [string, number][] = [
  ['/en', 0.24], ['/en/services', 0.11], ['/en/contact', 0.07], ['/fr', 0.07], ['/en/products/oak-table', 0.06], ['/en/products/walnut-chair', 0.05],
  ['/en/articles/caring-for-wood', 0.05], ['/fr/services', 0.04], ['/en/about', 0.04], ['/en/products/ash-shelf', 0.035], ['/de', 0.03],
  ['/fr/contact', 0.025], ['/en/articles/choosing-a-wood', 0.025], ['/en/pricing', 0.024], ['/en/projects', 0.022], ['/fr/products/oak-table', 0.02],
  ['/en/articles/natural-finishes', 0.018], ['/de/contact', 0.012], ['/en/legal-notice', 0.008], ['/admin/statistics', 0.01], ['/en/site-map', 0.006],
];
const DIMENSIONS: Record<string, [string, number][]> = {
  referrer: [['', 0.46], ['google.com', 0.27], ['bing.com', 0.05], ['duckduckgo.com', 0.04], ['youtube.com', 0.04], ['linkedin.com', 0.03], ['craft-directory.example', 0.02], ['facebook.com', 0.02], ['qwant.com', 0.012]],
  channel: [['direct', 0.43], ['organicSearch', 0.37], ['organicSocial', 0.08], ['referral', 0.06], ['organicVideo', 0.04], ['email', 0.01]],
  country: [['FR', 0.58], ['CH', 0.09], ['BE', 0.08], ['CA', 0.06], ['US', 0.04], ['DE', 0.035], ['GB', 0.02], ['ES', 0.015], ['IT', 0.015], ['MA', 0.012], ['SN', 0.008], ['LU', 0.007], ['JP', 0.005], ['BR', 0.004], ['AU', 0.003]],
  region: [['FR-ARA', 0.18], ['FR-IDF', 0.16], ['FR-PAC', 0.1], ['CH-GE', 0.05], ['BE-BRU', 0.04], ['CA-QC', 0.05], ['FR-OCC', 0.04]],
  city: [['Lyon', 0.11], ['Paris', 0.1], ['Grenoble', 0.06], ['Geneva', 0.05], ['Brussels', 0.04], ['Montreal', 0.04], ['Marseille', 0.035], ['Annecy', 0.03], ['Lausanne', 0.025], ['Toulouse', 0.02], ['Nantes', 0.015], ['Liege', 0.01]],
  // browser languages arrive with or without a region, as Umami records them
  language: [['fr-FR', 0.5], ['fr', 0.13], ['en-US', 0.09], ['fr-CH', 0.08], ['en-GB', 0.06], ['de-DE', 0.04], ['de-CH', 0.02], ['es', 0.025], ['it', 0.02], ['ja', 0.005]],
  device: [['mobile', 0.52], ['desktop', 0.3], ['laptop', 0.12], ['tablet', 0.06]],
  browser: [['chrome', 0.46], ['ios', 0.21], ['safari', 0.1], ['firefox', 0.08], ['edge-chromium', 0.07], ['samsung', 0.04], ['android', 0.02]],
  os: [['Android OS', 0.31], ['iOS', 0.27], ['Windows 10', 0.24], ['Mac OS', 0.13], ['Linux', 0.04]],
  screen: [['390x844', 0.21], ['1920x1080', 0.16], ['1536x864', 0.09], ['412x915', 0.09], ['1440x900', 0.06], ['768x1024', 0.04]],
  event: [['phone-click', 0.035], ['form-sent', 0.018], ['email-click', 0.022], ['catalogue-download', 0.016], ['directions-click', 0.01], ['video-play', 0.008]],
  hostname: [['www.example.test', 0.97], ['example.test', 0.03]],
  utmSource: [['youtube', 0.03], ['newsletter', 0.012], ['fair', 0.006]],
  utmMedium: [['video', 0.03], ['email', 0.012], ['print', 0.006]],
  utmCampaign: [['open-days', 0.014], ['autumn', 0.01]],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Umami 2 slot key: wall-clock time "YYYY-MM-DD HH:00:00". */
const wall = (t: number, unit: string) => {
  const s = local(t).toISOString();
  return unit === 'hour' ? `${s.slice(0, 13).replace('T', ' ')}:00:00` : `${s.slice(0, 10)} 00:00:00`;
};

function umami(url: URL, init: RequestInit | undefined, now: number): Response {
  if (url.pathname === '/api/auth/login') {
    const b = JSON.parse(String(init?.body ?? '{}')) as { username?: string; password?: string };
    return b.username === FAKE.username && b.password === FAKE.password ? json({ token: FAKE.umamiToken }) : json({ error: 'refused' }, 401);
  }
  const auth = new Headers(init?.headers).get('authorization');
  if (auth !== `Bearer ${FAKE.umamiToken}`) return json({ error: 'unauthorized' }, 401);
  const m = /^\/api\/websites\/([^/]+)\/(.+)$/.exec(url.pathname);
  if (!m || m[1] !== FAKE.websiteId) return json({ error: 'not found' }, 404);
  const p = url.searchParams;
  const from = Number(p.get('startAt') ?? now - DAY), to = Number(p.get('endAt') ?? now);
  const tagged = p.get('query')?.includes('utm_source') ? 0.03 : p.get('referrer') ? 0.045 : 1;
  const t = totals(from, to, tagged);
  switch (m[2]) {
    case 'stats': return json(t);
    case 'active': return json({ visitors: 2 + Math.floor(noise(Math.floor(now / 60_000)) * 5) });
    case 'pageviews': {
      const unit = p.get('unit') ?? 'day';
      const pv = new Map<string, number>();
      for (let h = Math.floor(from / HOUR) * HOUR; h < to; h += HOUR) pv.set(wall(h, unit), (pv.get(wall(h, unit)) ?? 0) + hourViews(h));
      const list = [...pv].filter(([, y]) => y > 0);
      return json({ pageviews: list.map(([x, y]) => ({ x, y })), sessions: list.map(([x, y]) => ({ x, y: Math.round(y * 0.43) })) });
    }
    case 'metrics': {
      const type = p.get('type') ?? '';
      const limit = Number(p.get('limit') ?? 10);
      if (type === 'url') return json({ error: 'type' }, 400);
      const weights = type === 'path' || type === 'entry' || type === 'exit' ? PATHS.map(([x, w], i) => [x, type === 'path' ? w : w * (type === 'entry' ? 0.56 : 0.5) * (1 + (i % 3) * 0.1)] as [string, number]) : DIMENSIONS[type];
      if (!weights) return json([]);
      // as Umami does: pages and events in views, entry and exit pages in visits, the other dimensions (country, language,
      // device, source…) in distinct visitors, so that a ranking never adds up to more visitors than the period had
      const base = type === 'path' || type === 'event' ? t.pageviews : type === 'entry' || type === 'exit' ? t.visits : t.visitors;
      return json(weights.map(([x, w]) => ({ x, y: Math.round(base * w) })).filter((r) => r.y > 0).sort((a, b) => b.y - a.y).slice(0, limit));
    }
    case 'metrics/expanded': {
      const type = p.get('type') ?? 'path';
      return json(PATHS.map(([name, w], i) => {
        const views = Math.round(t.pageviews * w);
        const visits = Math.round(views * (type === 'path' ? 0.7 : 0.5) * (1 + (i % 3) * 0.1));
        return { name, pageviews: String(views), visitors: Math.round(views * 0.6), visits, bounces: Math.round(visits * (0.25 + (i % 5) * 0.08)), totaltime: views * (40 + (i % 7) * 15) };
      }).filter((r) => Number(r.pageviews) > 0));
    }
    case 'sessions': {
      const places: [string, string][] = [['FR', 'Lyon'], ['CH', 'Geneva'], ['FR', 'Paris'], ['BE', 'Brussels'], ['CA', 'Montreal'], ['FR', 'Grenoble'], ['FR', 'Annecy'], ['DE', 'Berlin'], ['FR', 'Marseille'], ['US', 'Boston'], ['FR', 'Nantes'], ['MA', 'Rabat']];
      const devices = ['mobile', 'desktop', 'mobile', 'laptop', 'tablet', 'mobile'];
      const browsers = ['chrome', 'ios', 'firefox', 'safari', 'edge-chromium', 'chrome'];
      const systems = ['Android OS', 'iOS', 'Windows 10', 'Mac OS', 'iOS', 'Linux'];
      return json({ data: places.map(([country, city], i) => ({ country, city, device: devices[i % 6], browser: browsers[i % 6], os: systems[i % 6], views: 1 + Math.floor(noise(i) * 7), lastAt: new Date(now - (i * 17 + 3) * 60_000).toISOString() })), count: 12, page: 1, pageSize: 12 });
    }
    case 'events/series': {
      const unit = p.get('unit') ?? 'day';
      const views = new Map<string, number>();
      for (let h = Math.floor(from / HOUR) * HOUR; h < to; h += HOUR) views.set(wall(h, unit), (views.get(wall(h, unit)) ?? 0) + hourViews(h));
      return json([...views].flatMap(([t, v]) => DIMENSIONS['event'].map(([x, w]) => ({ x, t, y: Math.round(v * w) }))).filter((r) => r.y > 0));
    }
    case 'sessions/stats': return json({ pageviews: { value: t.pageviews }, visitors: { value: t.visitors }, visits: { value: t.visits }, countries: { value: 15 }, events: { value: Math.round(t.pageviews * 0.11) } });
    default: return json({ error: 'not found' }, 404);
  }
}

/* -------------------------------------------------------------------------------------------- Search Console */

const QUERIES = ['wood workshop lyon', 'custom cabinet maker', 'solid oak table', 'example workshop', 'walnut chair craftsman', 'caring for wooden furniture', 'ash shelf', 'joiner rhone alps', 'natural oil finish', 'custom furniture price', 'example workshop reviews', 'antique furniture restoration', 'solid wood desk', 'oak table top', 'choosing a wood species'];
const GPAGES = ['/en', '/en/services', '/en/products/oak-table', '/en/articles/caring-for-wood', '/en/contact', '/fr', '/en/products/walnut-chair', '/en/articles/choosing-a-wood', '/en/pricing', '/en/projects'];

function gscRows(body: { startDate: string; endDate: string; dimensions?: string[]; rowLimit?: number }) {
  const start = Date.parse(`${body.startDate}T00:00:00Z`), end = Date.parse(`${body.endDate}T00:00:00Z`);
  const days: number[] = [];
  for (let t = start; t <= end; t += DAY) days.push(t);
  const dayImp = (t: number) => Math.round(60 + 30 * Math.sin(t / (9 * DAY)) + noise(`g${t}`) * 40 + (t / DAY - 20000) * 0.15);
  const dayClicks = (t: number) => Math.round(dayImp(t) * (0.035 + noise(`c${t}`) * 0.02));
  const imp = days.reduce((n, t) => n + dayImp(t), 0), clk = days.reduce((n, t) => n + dayClicks(t), 0);
  const row = (keys: string[] | undefined, i: number, impressions: number, clicks: number, position: number) => ({ keys, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position });
  const dims = body.dimensions ?? [];
  const share = (n: number, i: number, salt: string) => Math.max(1, Math.round(n * (0.3 / (i + 1.4)) * (0.7 + noise(`${salt}${i}${body.startDate}`) * 0.6)));
  if (!dims.length) return [row(undefined, 0, imp, clk, 9.4 + noise(body.startDate) * 3)];
  const d = dims.join(',');
  if (d === 'date') return days.map((t, i) => row([new Date(t).toISOString().slice(0, 10)], i, dayImp(t), dayClicks(t), 8 + noise(`p${t}`) * 5));
  if (d === 'query') return QUERIES.map((q, i) => { const im = share(imp, i, q); return row([q], i, im, Math.round(im * (q.includes('example') ? 0.32 : i % 4 === 3 ? 0.005 : 0.04)), 1.2 + i * 1.6 + noise(q + body.startDate) * 2); })
    // a query only appears in some periods ("new queries")
    .filter((r) => r.keys![0] !== 'solid wood desk' || noise(body.startDate) > 0.5);
  if (d === 'page') return GPAGES.map((pg, i) => { const im = share(imp, i, pg); return row([`${FAKE.site}${pg}`], i, im, i === 8 ? 0 : Math.round(im * (i === 4 ? 0.01 : 0.05)), 2 + i * 1.3); });
  if (d === 'country') return [['fra', 0.7], ['che', 0.1], ['bel', 0.09], ['can', 0.06], ['usa', 0.05]].map(([c, w], i) => row([c as string], i, Math.round(imp * (w as number)), Math.round(clk * (w as number)), 7 + i));
  if (d === 'device') return [['MOBILE', 0.58], ['DESKTOP', 0.38], ['TABLET', 0.04]].map(([c, w], i) => row([c as string], i, Math.round(imp * (w as number)), Math.round(clk * (w as number)), 8 + i));
  if (d === 'query,page') return QUERIES.flatMap((q, i) => [row([q, `${FAKE.site}${GPAGES[i % GPAGES.length]}`], i, share(imp, i, q), Math.round(share(imp, i, q) * 0.04), 3 + i), ...(i % 5 === 1 ? [row([q, `${FAKE.site}${GPAGES[(i + 3) % GPAGES.length]}`], i, Math.round(share(imp, i, q) / 3), 0, 12 + i)] : [])]);
  if (d === 'searchAppearance') return [row(['REVIEW_SNIPPET'], 0, Math.round(imp * 0.08), Math.round(clk * 0.1), 4.2), row(['VIDEO'], 1, Math.round(imp * 0.03), 1, 6.1)];
  return [];
}

function google(url: URL, init: RequestInit | undefined): Response {
  if (url.pathname === '/token') return json({ access_token: FAKE.googleToken, expires_in: 3600, token_type: 'Bearer' });
  if (new Headers(init?.headers).get('authorization') !== `Bearer ${FAKE.googleToken}`) return json({ error: { message: 'unauthenticated' } }, 401);
  if (url.pathname === '/inspect') {
    const b = JSON.parse(String(init?.body)) as { inspectionUrl: string };
    const ok = !b.inspectionUrl.includes('site-map') && !b.inspectionUrl.includes('/de');
    return json({ inspectionResult: { indexStatusResult: { verdict: ok ? 'PASS' : 'NEUTRAL', coverageState: ok ? 'Submitted and indexed' : 'Discovered - currently not indexed', lastCrawlTime: ok ? '2026-11-14T06:12:00Z' : undefined } } });
  }
  const m = /^\/webmasters\/v3\/sites\/([^/]+)\/(searchAnalytics\/query|sitemaps)$/.exec(url.pathname);
  if (!m) return json({ error: 'not found' }, 404);
  if (m[2] === 'sitemaps') return json({ sitemap: [{ path: `${FAKE.site}/sitemap.xml`, lastDownloaded: '2026-11-17T04:00:00Z', isPending: false, errors: '0', warnings: '1', contents: [{ type: 'web', submitted: '18', indexed: '14' }] }] });
  return json({ rows: gscRows(JSON.parse(String(init?.body))) });
}

/* -------------------------------------------------------------------------------------------- YouTube */

const VIDEOS = [
  { id: 'vid-workshop-01', title: 'A tour of the workshop in three minutes', publishedAt: '2026-09-02T09:00:00Z', duration: 'PT3M12S' },
  { id: 'vid-oak-02', title: 'An oak table, from top to finish', publishedAt: '2026-09-23T09:00:00Z', duration: 'PT8M40S' },
  { id: 'vid-oil-03', title: 'Oiling furniture the right way', publishedAt: '2026-10-14T09:00:00Z', duration: 'PT5M05S' },
  { id: 'vid-walnut-04', title: 'Assembling a walnut chair', publishedAt: '2026-11-04T09:00:00Z', duration: 'PT11M20S' },
];

function youtube(url: URL, init: RequestInit | undefined, now: number): Response {
  if (url.pathname === '/token') return json({ access_token: FAKE.googleToken, expires_in: 3600 });
  if (new Headers(init?.headers).get('authorization') !== `Bearer ${FAKE.googleToken}`) return json({ error: { message: 'unauthenticated' } }, 401);
  const p = url.searchParams;
  const ytViews = (t: number) => Math.max(0, Math.round(18 + 12 * Math.sin(t / (6 * DAY)) + noise(`y${t}`) * 14 + (t - Date.parse('2026-09-01')) / DAY * 0.25));
  switch (url.pathname) {
    case '/youtube/v3/channels':
      return json({ items: [{ id: FAKE.channelId, snippet: { title: 'Example Workshop', customUrl: '@example-workshop', publishedAt: '2026-08-20T10:00:00Z', thumbnails: {} }, statistics: { viewCount: '9412', subscriberCount: '318', videoCount: String(VIDEOS.length) }, contentDetails: { relatedPlaylists: { uploads: 'UUdemo' } } }] });
    case '/youtube/v3/playlistItems':
      return json({ items: VIDEOS.map((v) => ({ contentDetails: { videoId: v.id } })) });
    case '/youtube/v3/videos':
      return json({ items: VIDEOS.filter((v) => p.get('id')?.split(',').includes(v.id)).map((v, i) => ({ id: v.id, snippet: { title: v.title, publishedAt: v.publishedAt }, contentDetails: { duration: v.duration }, status: { privacyStatus: i === 3 ? 'unlisted' : 'public' }, statistics: { viewCount: String(4100 - i * 900), likeCount: String(120 - i * 25), commentCount: String(14 - i * 3) } })) });
    case '/v2/reports': {
      const start = Date.parse(`${p.get('startDate')}T00:00:00Z`), end = Date.parse(`${p.get('endDate')}T00:00:00Z`);
      const dim = p.get('dimensions');
      if (dim === 'day') {
        const rows: unknown[][] = [];
        for (let t = start; t <= end; t += DAY) if (t >= Date.parse('2026-08-20')) rows.push([new Date(t).toISOString().slice(0, 10), ytViews(t), Math.round(ytViews(t) * 2.7), Math.round(noise(`s${t}`) * 3), noise(`l${t}`) > 0.85 ? 1 : 0]);
        return json({ columnHeaders: [{ name: 'day' }, { name: 'views' }, { name: 'estimatedMinutesWatched' }, { name: 'subscribersGained' }, { name: 'subscribersLost' }], rows });
      }
      if (dim === 'video') {
        const metrics = (p.get('metrics') ?? '').split(',');
        return json({ columnHeaders: [{ name: 'video' }, ...metrics.map((name) => ({ name }))], rows: VIDEOS.map((v, i) => [v.id, ...metrics.map((m) => (m === 'views' ? 4100 - i * 900 : m === 'estimatedMinutesWatched' ? 9800 - i * 2000 : m === 'averageViewDuration' ? 140 - i * 10 : 52 - i * 4))]).slice(0, Number(p.get('maxResults') ?? 200)) });
      }
      if (dim === 'insightTrafficSourceType') {
        return json({ columnHeaders: [{ name: 'insightTrafficSourceType' }, { name: 'views' }, { name: 'estimatedMinutesWatched' }], rows: [['YT_SEARCH', 310, 820], ['RELATED_VIDEO', 240, 700], ['EXT_URL', 96, 260], ['SUBSCRIBER', 80, 230], ['YT_CHANNEL', 44, 120], ['NO_LINK_OTHER', 20, 51]] });
      }
      return json({ columnHeaders: [], rows: [] });
    }
    default: return json({ error: 'not found' }, 404);
  }
}

function sitemap(): Response {
  const urls = ['/en', '/en/services', '/en/contact', '/en/pricing', '/en/projects', '/en/products/oak-table', '/en/site-map', '/fr', '/de'].map((u) => `<url><loc>${FAKE.site}${u}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}

/** Fake `fetch`: answers the *.example.test addresses, refuses the rest (no network call). */
export function fakeFetch(opts: { now?: () => number; latencyMs?: number } = {}) {
  return async (input: string, init?: RequestInit): Promise<Response> => {
    if (opts.latencyMs) await new Promise((r) => setTimeout(r, opts.latencyMs));
    const url = new URL(input);
    const now = (opts.now ?? Date.now)();
    if (url.origin === FAKE.umami) return umami(url, init, now);
    if (url.origin === FAKE.google) return google(url, init);
    if (url.origin === FAKE.youtube) return youtube(url, init, now);
    if (url.origin === FAKE.site && url.pathname === '/sitemap.xml') return sitemap();
    throw new Error(`external call refused: ${url.origin}`);
  };
}

/** Fictitious service account key (RSA pair generated on the fly: nothing secret in the repository). */
export async function fakeServiceAccount(): Promise<string> {
  const { generateKeyPairSync } = await import('node:crypto');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return JSON.stringify({ client_email: 'stats-reader@demo-project.iam.example.test', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), token_uri: `${FAKE.google}/token` });
}

/** Demo settings for the three sources. */
export async function fakeSources() {
  return {
    umami: { url: FAKE.umami, websiteId: FAKE.websiteId, username: FAKE.username, password: FAKE.password, dashboardUrl: `${FAKE.umami}/websites/${FAKE.websiteId}` },
    gsc: { property: 'sc-domain:example.test', serviceAccount: await fakeServiceAccount(), apiUrl: `${FAKE.google}/webmasters/v3`, inspectUrl: `${FAKE.google}/inspect`, sitemapUrl: `${FAKE.site}/sitemap.xml`, brandTerms: ['example'] },
    youtube: { clientId: 'demo-client', clientSecret: 'demo-secret', refreshToken: 'demo-refresh-token', channelId: FAKE.channelId, tokenUrl: `${FAKE.youtube}/token`, apiUrl: `${FAKE.youtube}/youtube/v3`, analyticsUrl: `${FAKE.youtube}/v2` },
  };
}
