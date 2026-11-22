import { createServer } from 'node:http';
import { inflateSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { createTexts, type StatsOverview } from 'stats-kit/contract';
import { buildOverview, buildReport, eventSeries, createStatsKit, gscClient, loadWorld, previewHtml, renderWorldMap, resolveRange, umamiClient, youtubeClient, type Fetch, type StatsKitConfig } from 'stats-kit/server';
import { sourceVisits } from '../src/overview.ts';
import { FAKE, fakeFetch, fakeSources } from '../../../demo/fake/services.ts';
import { latin, pseudoTexts, scrub } from '../../contract/test/pseudo.ts';

const NOW = Date.parse('2026-11-16T10:30:00Z');
const fake = fakeFetch({ now: () => NOW });
const sources = await fakeSources();
const umamiCfg = sources.umami;

/** `fetch` that answers something particular once, then hands over to the fake service. */
const tweak = (match: (url: string, init?: RequestInit) => Response | null): Fetch => async (url, init) => match(url, init) ?? fake(url, init);

describe('Umami connector', () => {
  it('signs in once for simultaneous calls and again on a 401', async () => {
    let logins = 0, expired = true;
    const f = tweak((url) => {
      if (url.endsWith('/api/auth/login')) logins++;
      if (url.includes('/active') && expired) return (expired = false), new Response('{}', { status: 401 });
      return null;
    });
    const u = umamiClient(umamiCfg, f);
    await Promise.all([u.get('stats', { startAt: NOW - 1000, endAt: NOW }), u.get('stats', { startAt: NOW - 1000, endAt: NOW })]);
    expect(logins).toBe(1);
    expect(await u.get<{ visitors: number }>('active')).toHaveProperty('visitors');
    expect(logins).toBe(2);
    u.reset();
  });
  it('warns, without any secret, when the connector uses the default account of a new Umami', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    umamiClient(umamiCfg, fake);
    umamiClient({ url: 'https://u.example.test', websiteId: 'w', apiKey: 'admin' }, fake);
    expect(warn).not.toHaveBeenCalled();
    umamiClient({ url: 'https://u.example.test', websiteId: 'w', username: 'admin', password: 'umami' }, fake);
    expect(warn).toHaveBeenCalledOnce();
    const logged = String(warn.mock.calls[0][0]);
    expect(logged).toContain('default account');
    expect(logged).not.toMatch(/umami'|"umami"|password:|admin/);
    warn.mockRestore();
  });
  it('refuses a wrong account', async () => {
    await expect(umamiClient({ ...umamiCfg, password: 'wrong' }, fake).get('stats')).rejects.toThrow('umami login 401');
  });
  it('API key (Umami Cloud): no sign-in', async () => {
    const seen: string[] = [];
    const f: Fetch = async (url, init) => (seen.push(`${url} ${new Headers(init?.headers).get('x-umami-api-key')}`), new Response('{"visitors":1}'));
    await umamiClient({ url: 'https://api.umami.example.test/v1/', websiteId: 'w', apiKey: 'key' }, f).get('active');
    expect(seen).toEqual(['https://api.umami.example.test/v1/websites/w/active key']);
  });
  it('"path" becomes "url" on Umami 2, once and for all', async () => {
    const types: string[] = [];
    const f = tweak((url) => {
      const t = new URL(url).searchParams.get('type');
      if (t) types.push(t);
      return t === 'path' ? new Response('bad', { status: 400 }) : t === 'url' ? new Response('[{"x":"/","y":1}]') : null;
    });
    const u = umamiClient(umamiCfg, f);
    expect(await u.metric('path', 0, NOW)).toEqual([{ x: '/', y: 1 }]);
    await u.metric('path', 0, NOW);
    await expect(u.metric('country', 0, NOW, 5, { x: '1' })).resolves.toBeInstanceOf(Array);
    expect(types).toEqual(['path', 'url', 'url', 'country']);
    await expect(umamiClient(umamiCfg, tweak((url) => (url.includes('type=city') ? new Response('', { status: 500 }) : null))).metric('city', 0, NOW)).rejects.toThrow('500');
  });
});

describe('overview', () => {
  const opts = { timeZone: 'Europe/Paris', pages: { languages: ['en', 'fr', 'de'], labels: { '/': 'Home' }, groups: [{ id: 'p', title: 'Products', pattern: /^\/products\/(.+)$/ }] }, events: { labels: { 'phone-click': 'Call' } }, goals: [{ id: 'tel', label: 'Calls', events: ['phone-click'] }], dashboardUrl: 'https://umami.example.test/websites/x' };
  it('gathers all the data of a period, consistent with each other', async () => {
    const range = resolveRange({ days: 30 }, 'Europe/Paris', NOW);
    const o = await buildOverview(umamiClient(umamiCfg, fake), range, opts, NOW);
    expect(o.status).toBe('ok');
    expect(o.series.slots).toHaveLength(31);
    expect(o.series.pageviews.reduce((a, b) => a + b, 0)).toBe(o.totals.pageviews);
    expect(o.series.previousPageviews).toHaveLength(31);
    expect(o.last24h.slots).toHaveLength(25); // first and last hours started
    expect(o.heatmap.flat().reduce((a, b) => a + b, 0)).toBe(o.totals.pageviews);
    expect(o.breakdowns.pages[0]).toMatchObject({ key: '/', label: 'Home' });
    expect(o.breakdowns.pages.some((p) => p.key.startsWith('/admin'))).toBe(false);
    expect(o.breakdowns.siteLanguages.map((l) => l.key)).toEqual(['en', 'fr', 'de']);
    expect(o.breakdowns.events.find((e) => e.key === 'phone-click')?.label).toBe('Call');
    expect(o.goals[0]).toMatchObject({ id: 'tel', label: 'Calls' });
    expect(o.goals[0].value).toBeGreaterThan(0);
    expect(o.groups[0].items.map((i) => i.key)).toContain('oak-table');
    expect(o.pages[0]).toMatchObject({ key: '/', label: 'Home' });
    expect(o.sessions).toHaveLength(12);
    expect(o.counts.countries).toBe(15);
    expect(o.active).toBeGreaterThanOrEqual(2);
    expect(o.dashboardUrl).toBe(opts.dashboardUrl);
    expect(o.previous?.pageviews).toBeGreaterThan(0);
    // events day by day, aligned on the slots of the period, consistent with the totals of the events
    const phone = o.eventSeries?.['phone-click'] ?? [];
    expect(phone).toHaveLength(31);
    expect(phone.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
  it('24 hours: hourly series, heatmap drawn from the same series', async () => {
    const o = await buildOverview(umamiClient(umamiCfg, fake), resolveRange({ days: 1 }, 'UTC', NOW), { timeZone: 'UTC' }, NOW);
    expect([o.range.unit, o.series.unit, o.series.slots.length]).toEqual(['hour', 'hour', 25]);
    expect(o.eventSeries).not.toBeNull();
    expect(Object.values(o.eventSeries!).every((v) => v.length === 25)).toBe(true);
  });
  it('event series: points outside the period or malformed are ignored; refused by Umami: null', async () => {
    const slots = ['2026-11-15', '2026-11-16'];
    expect(eventSeries(slots, [{ x: 'a', t: '2026-11-15 00:00:00', y: 2 }, { x: 'a', t: '2026-11-16T00:00:00Z', y: 1 }, { x: 'a', t: '2026-10-01 00:00:00', y: 9 }, { x: 'b', t: null as never, y: 1 }, { x: 'c', t: '2026-11-16 00:00:00', y: 'x' as never }], 'day', 'Europe/Paris'))
      .toEqual({ a: [2, 1], c: [0, 0] });
    const f = tweak((url) => (url.includes('/events/series') ? new Response('', { status: 500 }) : null));
    expect((await buildOverview(umamiClient(umamiCfg, f), resolveRange({ days: 7 }, 'UTC', NOW), { timeZone: 'UTC' }, NOW)).eventSeries).toBeNull();
    expect((await buildOverview(null, resolveRange({ days: 7 }, 'UTC', NOW), { timeZone: 'UTC' }, NOW)).eventSeries).toBeNull();
  });
  it('missing extras: the overview stays complete, empty values', async () => {
    const f = tweak((url) => (/\/websites\/[^/]+\/stats\?/.test(url) || url.includes('/auth/login') ? null : new Response('', { status: 500 })));
    const o = await buildOverview(umamiClient(umamiCfg, f), resolveRange({ days: 7 }, 'UTC', NOW), { timeZone: 'UTC' }, NOW);
    expect([o.status, o.active, o.series.previousPageviews, o.breakdowns.countries, o.sessions, o.counts]).toEqual(['ok', null, null, [], [], { countries: null, events: null }]);
    expect(o.dashboardUrl).toBeNull();
  });
  it('Umami down: "error" state, site data kept', async () => {
    const f = tweak((url) => (url.includes('/stats') ? new Response('', { status: 502 }) : null));
    const extras = vi.fn(async () => ({ tiles: [], tables: [], funnel: null }));
    const o = await buildOverview(umamiClient(umamiCfg, f), resolveRange({ days: 7 }, 'UTC', NOW), { timeZone: 'UTC', extras }, NOW);
    expect([o.status, o.error, o.extras]).toEqual(['error', 'umami stats 502', { tiles: [], tables: [], funnel: null }]);
  });
  it('without Umami: "not configured"; failing site data: ignored', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const o = await buildOverview(null, resolveRange({ days: 7 }, 'UTC', NOW), { timeZone: 'UTC', extras: async () => { throw new Error('database'); } }, NOW);
    expect([o.status, o.extras]).toEqual(['not-configured', null]);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
  it('visits from a tracked source', async () => {
    const v = await sourceVisits(umamiClient(umamiCfg, fake), NOW - 7 * 86_400_000, NOW, 'youtube', { languages: ['en', 'fr', 'de'] });
    expect(v.visits).toBeGreaterThan(0);
    expect(v.referred).toBeGreaterThan(0);
    expect(v.landing[0].key).toBe('/');
    const none = await sourceVisits(umamiClient(umamiCfg, tweak((url) => (url.includes('referrer=') || url.includes('type=path') ? new Response('', { status: 400 }) : null))), 0, NOW, 'youtube');
    expect([none.referred, none.landing]).toEqual([null, []]);
  });
});

describe('Search Console', () => {
  it('performance, previous period, extras, sitemaps, cache', async () => {
    const calls: string[] = [];
    const g = gscClient(sources.gsc, async (url, init) => (calls.push(url), fake(url, init)));
    const p = await g.overview({ days: 28 }, NOW);
    expect([p.status, p.days, p.end, p.property, p.serviceAccount]).toEqual(['ok', 28, '2026-11-14', 'sc-domain:example.test', 'stats-reader@demo-project.iam.example.test']);
    expect(p.series).toHaveLength(28);
    expect(p.totals.impressions).toBe(p.series.reduce((n, d) => n + d.impressions, 0));
    expect([p.queries.length > 10, p.pages[0].key, p.countries[0].key, p.devices.length, p.queryPages.length > 10, p.appearance.length, p.sitemaps?.[0].indexed]).toEqual([true, `${FAKE.site}/en`, 'fra', 3, true, 2, 14]);
    const n = calls.length;
    await g.overview({ days: 28 }, NOW);
    expect(calls.length).toBe(n); // kept in cache
    g.reset();
  });
  it('OAuth, refusals and readable errors', async () => {
    const oauth = { property: 'sc-domain:example.test', oauth: { client_id: 'i', client_secret: 's', refresh_token: 'r' }, apiUrl: `${FAKE.google}/webmasters/v3`, tokenUrl: `${FAKE.google}/token` };
    const bodies: string[] = [];
    const ok = await gscClient(oauth, async (url, init) => (url.endsWith('/token') && bodies.push(String(init?.body)), fake(url, init))).overview({ days: 7 }, NOW);
    expect([ok.status, ok.serviceAccount]).toEqual(['ok', null]);
    expect(bodies[0]).toContain('grant_type=refresh_token');
    const denied = await gscClient(oauth, tweak((url) => (url.includes('searchAnalytics') ? new Response('denied', { status: 403 }) : null))).overview({ days: 7 }, NOW);
    expect([denied.status, denied.error]).toEqual(['error', 'gsc 403 (access denied: missing permission on the property, or Search Console API not enabled) denied']);
    const partial = await gscClient(oauth, tweak((url, init) => (String(init?.body ?? '').includes('searchAppearance') || url.endsWith('/sitemaps') ? new Response('', { status: 500 }) : null))).overview({ days: 7 }, NOW);
    expect([partial.status, partial.appearance, partial.sitemaps]).toEqual(['ok', [], null]);
    const noRows = await gscClient(oauth, tweak((url) => (url.includes('searchAnalytics') ? new Response('{}') : url.endsWith('/sitemaps') ? new Response('{"sitemap":[{"path":"p"}]}') : null))).overview({ days: 7 }, NOW);
    expect([noRows.totals.clicks, noRows.series, noRows.sitemaps?.[0]]).toEqual([0, [], { path: 'p', lastDownloaded: null, errors: 0, warnings: 0, pending: false, submitted: 0, indexed: null }]);
    expect((await gscClient({ ...oauth, apiUrl: undefined, tokenUrl: undefined }, tweak((url) => (url.startsWith('https://oauth2.googleapis.com') ? new Response('{"access_token":"t","expires_in":60}') : url.startsWith('https://www.googleapis.com') ? new Response('{}') : null))).overview({}, NOW)).status).toBe('ok');
  });
  it('indexing page by page, filtered, kept in cache', async () => {
    const g = gscClient({ ...sources.gsc, indexationFilter: (u) => !u.endsWith('/fr') }, fake);
    const ix = await g.indexation(NOW);
    expect([ix.status, ix.total, ix.indexed]).toEqual(['ok', 8, 6]);
    expect(ix.pages.find((p) => p.url.endsWith('/site-map'))).toMatchObject({ indexed: false, verdict: 'NEUTRAL', lastCrawl: null });
    expect((await g.indexation(NOW)).checkedAt).toBe(ix.checkedAt);
    expect((await gscClient({ ...sources.gsc, sitemapUrl: undefined }, fake).indexation()).status).toBe('not-configured');
    expect((await gscClient(sources.gsc, tweak((url) => (url.endsWith('sitemap.xml') ? new Response('', { status: 404 }) : null))).indexation()).error).toBe('sitemap 404');
    const broken = await gscClient(sources.gsc, tweak((url) => (url.endsWith('/inspect') ? new Response('', { status: 429 }) : url.endsWith('/sitemap.xml') ? new Response('<loc>https://x/a</loc>') : null))).indexation();
    expect(broken.pages[0]).toMatchObject({ verdict: 'ERROR', indexed: false });
    const empty = await gscClient(sources.gsc, tweak((url) => (url.endsWith('/inspect') ? new Response('{}') : url.endsWith('/sitemap.xml') ? new Response('<loc>https://x/a</loc>') : null))).indexation();
    expect(empty.pages[0]).toMatchObject({ verdict: 'UNKNOWN', state: '—' });
  });
});

describe('YouTube', () => {
  it('channel, videos, 180 days, period, traffic sources, site side', async () => {
    let oak = 'Oak film';
    const y = youtubeClient({ ...sources.youtube, videoLabel: (v) => (v.id === 'vid-oak-02' ? oak : null), extraVideoIds: async () => ['vid-workshop-01'] }, fake);
    const site = { visits: async () => ({ visits: 5, visitors: 4, referred: 6, landing: [] }), requests: async () => ({ total: 2, bySubject: [] }) };
    const o = await y.overview(28, site, NOW);
    expect([o.status, o.channel?.handle, o.channel?.url, o.videos.length, o.series.length, o.days, o.end, o.traffic[0].source, o.site?.requests]).toEqual(['ok', '@example-workshop', 'https://www.youtube.com/@example-workshop', 4, 180, 28, '2026-11-15', 'YT_SEARCH', 2]);
    expect(o.videos[0].publishedAt! > o.videos[3].publishedAt!).toBe(true);
    expect(o.videos.find((v) => v.id === 'vid-oak-02')).toMatchObject({ label: 'Oak film', duration: 520, minutes: 7800 });
    // the site's labels are read at every answer, while the channel data stays in cache
    oak = 'Oak film, new name';
    expect((await y.overview(28, site, NOW)).videos.find((v) => v.id === 'vid-oak-02')?.label).toBe('Oak film, new name');
    expect(o.totals.views).toBe(o.series.slice(-28).reduce((n, d) => n + d.views, 0));
    expect(await y.topVideo(o.start, o.end)).toMatchObject({ title: 'A tour of the workshop in three minutes', views: 4100 });
    expect((await y.overview(500, undefined, NOW)).days).toBe(90);
    expect((await y.overview(Number.NaN, undefined, NOW)).days).toBe(28);
    y.reset();
  });
  it('wrong channel, revoked token, Analytics refused, empty channel', async () => {
    expect((await youtubeClient({ ...sources.youtube, channelId: 'other' }, fake).overview(28, undefined, NOW)).error).toContain('not to the expected channel');
    const revoked = await youtubeClient(sources.youtube, tweak((url) => (url.endsWith('/token') ? new Response('{"error":"invalid_grant"}', { status: 400 }) : null))).overview(28);
    expect([revoked.status, revoked.error]).toEqual(['error', 'youtube token 400 (authorisation revoked or expired: the channel owner must authorise access again)']);
    expect((await youtubeClient(sources.youtube, tweak((url) => (url.endsWith('/token') ? new Response('{"error":"other"}', { status: 401 }) : null))).overview(28)).error).toBe('youtube token 401 other');
    expect((await youtubeClient(sources.youtube, tweak((url) => (url.endsWith('/token') ? new Response('nope', { status: 500 }) : null))).overview(28)).error).toBe('youtube token 500');
    const noAnalytics = await youtubeClient(sources.youtube, tweak((url) => (url.includes('/v2/reports') ? new Response('quota', { status: 403 }) : null))).overview(28, undefined, NOW);
    expect([noAnalytics.status, noAnalytics.analyticsError?.startsWith('youtube 403 (access denied'), noAnalytics.videos[0].minutes]).toEqual(['ok', true, null]);
    expect((await youtubeClient(sources.youtube, tweak((url) => (url.includes('/channels') ? new Response('{"items":[]}') : null))).overview(28)).error).toBe('no channel for this Google account');
    const bare = await youtubeClient({ ...sources.youtube, channelId: undefined }, tweak((url) => (url.includes('/channels') ? new Response(`{"items":[{"id":"UCx","snippet":{"thumbnails":{"default":{"url":"t"}}},"statistics":{"hiddenSubscriberCount":true}}]}`) : null))).overview(7, undefined, NOW);
    expect([bare.channel?.title, bare.channel?.url, bare.channel?.subscribers, bare.channel?.thumbnail, bare.videos]).toEqual(['UCx', 'https://www.youtube.com/channel/UCx', null, 't', []]);
    const handle = await youtubeClient({ ...sources.youtube, channelId: undefined }, tweak((url) => (url.includes('/channels') ? new Response('{"items":[{"id":"UCy","snippet":{"customUrl":"channel"}}]}') : null))).overview(7, undefined, NOW);
    expect(handle.channel?.url).toBe('https://www.youtube.com/@channel');
    const raw = await youtubeClient({ ...sources.youtube, channelId: undefined, apiUrl: undefined, analyticsUrl: undefined, tokenUrl: undefined }, async (url) => new Response(url.includes('oauth2') ? '{"access_token":"t","expires_in":60}' : url.includes('/channels') ? '{"items":[{"id":"UCz","contentDetails":{"relatedPlaylists":{"uploads":"U"}}}]}' : url.includes('/videos') ? '{"items":[{"id":"v1"}]}' : url.includes('/playlistItems') ? '{"items":[{"contentDetails":{"videoId":"v1"}},{}]}' : '{}')).overview(7, undefined, NOW);
    expect(raw.videos[0]).toMatchObject({ id: 'v1', title: 'v1', visibility: 'public', views: 0, likes: null, duration: 0 });
    // Analytics refused: the partial answer is not kept, YouTube is asked again at the next call
    let refuse = true, channelCalls = 0;
    const flaky = youtubeClient(sources.youtube, tweak((url) => {
      if (url.includes('/channels')) channelCalls++;
      return refuse && url.includes('/v2/reports') ? new Response('quota', { status: 403 }) : null;
    }));
    expect((await flaky.overview(28, undefined, NOW)).analyticsError).toBeTruthy();
    refuse = false;
    expect((await flaky.overview(28, undefined, NOW)).analyticsError).toBeNull();
    await flaky.overview(28, undefined, NOW);
    expect(channelCalls).toBe(2);
    expect(await youtubeClient(sources.youtube, tweak((url) => (url.includes('dimensions=video') && url.includes('maxResults=1') ? new Response('{"rows":[]}') : null))).topVideo('2026-11-01', '2026-11-07')).toBeNull();
  });
});

describe('report', () => {
  const texts = createTexts('en');
  const overview = async (days = 7) => buildOverview(umamiClient(umamiCfg, fake), resolveRange({ days }, 'Europe/Paris', NOW), { timeZone: 'Europe/Paris', goals: [{ id: 'tel', label: 'Calls', events: ['phone-click'] }] }, NOW);
  const world = loadWorld();
  it('PNG map with the right dimensions', () => {
    const map = renderWorldMap([{ key: 'fr', value: 10 }, { key: 'FR', value: 2 }, { key: 'LU', value: 3 }, { key: 'ZZ', value: 1 }], { features: [...world.features.slice(0, 40), { properties: { iso2: 'XX' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 0]]] } }] }, { background: [1, 2, 3], land: [4, 5, 6], border: [7, 8, 9], low: [10, 11, 12], high: [13, 14, 15] }, 360);
    expect([map.width, map.height, map.png.readUInt32BE(16), map.png.readUInt32BE(20)]).toEqual([360, 142, 360, 142]);
    const idat = map.png.indexOf('IDAT');
    expect(inflateSync(map.png.subarray(idat + 4, idat + 4 + map.png.readUInt32BE(idat - 4))).length).toBe((360 * 3 + 1) * 142);
  });
  const full = async () => {
    const o: StatsOverview = { ...(await overview()), extras: { tiles: [{ id: 'd', label: 'Requests', value: 12, previous: 10, sub: null, group: null, highlight: false }, { id: 't', label: 'To handle', value: '3', previous: null, sub: 'pending', group: null, highlight: true, link: { url: 'https://www.example.test/admin/requests?a=1&b=2', label: 'Open the requests' } }, { id: 's', label: 'Text', value: 'ok', previous: null, sub: 'below', group: null, highlight: false }], tables: [{ id: 'x', title: 'Subjects', sub: 'by subject', head: 'Subject', column: 'Requests', section: 'actions', items: [{ key: 'a', label: null, value: 2, previous: null }] }], funnel: null } };
    const search = await gscClient(sources.gsc, fake).overview({ days: 7 }, NOW);
    const youtube = await youtubeClient(sources.youtube, fake).overview(7, { visits: async () => ({ visits: 5, visitors: 4, referred: 1, landing: [] }), requests: async () => ({ total: 1, bySubject: [] }) }, NOW);
    return { o, search, youtube };
  };
  it('complete: figures, goals, site data, map, Google, YouTube, attached logo', async () => {
    const { o, search, youtube } = await full();
    const m = buildReport({ overview: o, search, youtube, youtubeTop: { title: 'Film <1>', url: 'https://youtube.example.test/v', views: 9 }, texts: createTexts('en', { report: { intro: 'Hello,\nhere is the report.' } }), theme: { brand: '#1d3c9c', logo: { png: new Uint8Array([1, 2, 3]), alt: 'Logo' } }, siteName: 'Example Workshop', statsUrl: 'https://www.example.test/admin', searchUrl: 'https://www.example.test/admin/google', youtubeUrl: 'https://www.example.test/admin/youtube', weekly: true, world });
    expect(m.subject).toBe('Example Workshop — weekly traffic report');
    // link of a highlighted tile, links to the Google and YouTube pages, countries seen in Google
    for (const s of ['href="https://www.example.test/admin/requests?a=1&#38;b=2"', '>Open the requests</a>', 'href="https://www.example.test/admin/google"', 'Google page of the administration →', 'href="https://www.example.test/admin/youtube"', 'YouTube page of the administration →', 'Countries (Google)', 'France']) expect(m.html).toContain(s);
    expect(m.text).toContain('To handle: 3 (pending) https://www.example.test/admin/requests?a=1&b=2');
    expect(m.text).toContain('COUNTRIES (GOOGLE)');
    expect(m.attachments.map((a) => [a.cid, a.filename])).toEqual([['stats-kit-logo', 'logo.png'], ['stats-kit-map', 'map.png']]);
    for (const s of ['width="760"', 'lang="en-GB"', 'cid:stats-kit-map', 'cid:stats-kit-logo', 'Calls', 'Requests', 'To handle: 3', 'In Google', 'On YouTube', 'Film &#60;1&#62;', 'Subjects', 'Hello,<br>here', 'See all statistics', '<!--[if mso]>', 'Monday']) expect(m.html).toContain(s);
    expect(m.html).not.toMatch(/<script|<svg/i);
    for (const s of ['Visitors: ', 'IN GOOGLE', 'ON YOUTUBE', 'Statistics: https://www.example.test/admin', 'Most viewed video: Film <1>']) expect(m.text).toContain(s);
    const preview = previewHtml(m);
    expect(preview).toContain('data:image/png;base64,');
    expect(preview).not.toContain('cid:');
  });
  it('colours of the PNG map given by the site; an invalid colour falls back to the derived one', async () => {
    const o = await overview();
    const png = (map?: { background?: string; land?: string; border?: string; low?: string; high?: string }) => buildReport({ overview: o, texts, theme: { brand: '#344d9b', map }, siteName: 'S', world }).attachments.find((a) => a.cid === 'stats-kit-map')!.content;
    const base = Buffer.from(png());
    expect(Buffer.from(png({ background: '#e9eefa', land: '#d0d7ea', border: '#fafbff', low: '#96aaeb', high: '#344d9b' })).equals(base)).toBe(false);
    expect(Buffer.from(png({ background: 'blue', low: '#12345' })).equals(base)).toBe(true);
    // highlighted site data in amber by default, colours given by the site otherwise
    const { o: full0 } = await full();
    expect(buildReport({ overview: full0, texts, theme: { brand: '#344d9b' }, siteName: 'S', world: null }).html).toContain('background:#fff3d6');
    expect(buildReport({ overview: full0, texts, theme: { brand: '#344d9b', warnSoft: '#ffeeaa', warnInk: 'x' }, siteName: 'S', world: null }).html).toMatch(/background:#ffeeaa[^>]*><tr><td style="padding:14px 16px;[^"]*color:#5a3b00/);
  });
  it('in French and in German, with the punctuation and formats of each language', async () => {
    const { o, search, youtube } = await full();
    const fr = buildReport({ overview: o, search, youtube, texts: createTexts('fr'), theme: { brand: '#1d3c9c' }, siteName: 'Atelier', world: null });
    expect(fr.subject).toMatch(/^Atelier — rapport de fréquentation \(/);
    for (const s of ['Visiteurs : ', 'DANS GOOGLE', 'Rebond : ']) expect(fr.text).toContain(s);
    expect(fr.html).toContain('lundi');
    expect(fr.html).toMatch(/\d[\u00a0\u202f ]%/);
    const de = buildReport({ overview: o, search, youtube, texts: createTexts('de'), theme: { brand: '#1d3c9c' }, siteName: 'Werkstatt', world: null });
    expect(de.html).toContain('lang="de-DE"');
    expect(de.html).toContain('Montag');
    expect(de.text).toContain(`${createTexts('de').report.visitors}: `);
  });
  it('no hard-coded text: with a pseudo-locale, nothing Latin remains in the HTML or in the text version', async () => {
    const { o, search, youtube } = await full();
    const m = buildReport({ overview: scrub(o), search: scrub(search), youtube: scrub(youtube), youtubeTop: { title: '‡', url: 'ж', views: 9 }, texts: pseudoTexts(), theme: { brand: '#1d3c9c', logo: { png: new Uint8Array([1]), alt: '‡' } }, siteName: '‡', statsUrl: 'https://x', searchUrl: 'https://x', youtubeUrl: 'https://x', weekly: true, world: null, blocks: [{ title: '‡', hint: '‡', figures: [{ value: '‡', label: '‡', sub: '‡' }], lines: ['‡'] }] });
    const visible = m.html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
    const attributes = [...m.html.matchAll(/\s(?:alt|title)="([^"]*)"/g)].map((x) => x[1]).join(' ');
    expect(latin(visible)).toEqual([]);
    expect(latin(attributes)).toEqual([]);
    expect(latin(m.text)).toEqual([]);
    expect(latin(m.subject)).toEqual([]);
  });
  it('at a glance, previous period next to each day, site cards, totals in the subject', async () => {
    const { o } = await full();
    const blocks = [
      { title: 'Cost of the site', hint: 'Monthly estimate', figures: [{ value: '$14.30', label: 'per month', sub: '$171.60 per year' }, { value: '2', label: 'services' }, { value: '0', label: 'usage' }, { value: '1', label: 'domain' }] },
      { title: 'News', lines: ['New page <online>'] },
    ];
    const texts = createTexts('en', { report: { subject: '{site}: {visitors} visitors ({change}), {visits} visits, {pageviews} page views' } });
    const m = buildReport({ overview: o, texts, theme: { brand: '#1d3c9c' }, siteName: 'Workshop', world: null, blocks });
    for (const s of ['At a glance', 'Top traffic source: ', 'Top country: France', 'Most viewed page: ', 'Most frequent entry page: ', 'Busiest slot: ', 'This period', 'Previous period, day by day', 'Cost of the site', 'Monthly estimate', '$171.60 per year', 'New page &#60;online&#62;']) expect(m.html).toContain(s);
    for (const s of ['AT A GLANCE', '  - Best day: ', 'COST OF THE SITE', '  - per month: $14.30 ($171.60 per year)', '  - services: 2', '  - New page <online>']) expect(m.text).toContain(s);
    expect(m.subject).toMatch(/^Workshop: \d+ visitors \([+−-]?\d+ ?%\), \d+ visits, \d+ page views$/);
    expect(m.html.indexOf('At a glance')).toBeLessThan(m.html.indexOf('Page views per day'));
    expect(m.html.indexOf('Cost of the site')).toBeGreaterThan(m.html.indexOf('Most viewed pages'));
    // without the previous period: no empty brackets in the subject, no legend; card removed on request
    const alone = buildReport({ overview: { ...o, previous: null, series: { ...o.series, previousPageviews: null } }, texts, theme: { brand: '#1d3c9c' }, siteName: 'Workshop', world: null, glance: false });
    expect(alone.subject).toMatch(/^Workshop: \d+ visitors, \d+ visits/);
    for (const s of ['At a glance', 'Previous period, day by day']) expect(alone.html).not.toContain(s);
    expect(alone.text).toContain('Best day: ');
  });
  it('degraded: Umami missing or down, Google and YouTube down, online logo, no button', async () => {
    const range = resolveRange({ days: 7 }, 'UTC', NOW);
    const off = await buildOverview(null, range, { timeZone: 'UTC' }, NOW);
    const g = { ...(await gscClient(sources.gsc, fake).overview({ days: 7 }, NOW)), status: 'error' as const };
    const y = { ...(await youtubeClient(sources.youtube, fake).overview(7, undefined, NOW)), status: 'error' as const };
    const m = buildReport({ overview: off, search: g, youtube: y, texts, theme: { brand: '#000000', logo: { url: 'https://www.example.test/logo.png', width: 90, height: 30 } }, siteName: 'Site', world: null });
    expect(m.attachments).toEqual([]);
    for (const s of ['are not connected', 'temporarily unavailable.', 'https://www.example.test/logo.png', 'height="30"']) expect(m.html).toContain(s);
    expect(m.html).not.toContain('See all');
    expect(m.subject).toMatch(/^Site — traffic report \(/);
    const broken = { ...off, status: 'error' as const };
    expect(buildReport({ overview: broken, texts, theme: { brand: '#000000' }, siteName: 'S', world, statsUrl: null }).html).toContain('temporarily unavailable');
  });
  it('no visits, no countries, no Google impressions; Umami dashboard as fallback; footer removed', async () => {
    const o = await overview(1);
    const quiet: StatsOverview = { ...o, totals: { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 }, previous: null, series: { ...o.series, pageviews: o.series.pageviews.map(() => 0) }, heatmap: o.heatmap.map((r) => r.map(() => 0)), breakdowns: { ...o.breakdowns, countries: [] }, goals: [], dashboardUrl: 'https://umami.example.test/d' };
    const search = await gscClient(sources.gsc, fake).overview({ days: 7 }, NOW);
    const m = buildReport({ overview: quiet, search: { ...search, totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 } }, youtube: null, texts: createTexts('en', { report: { footer: '' } }), theme: { brand: '#2244aa' }, siteName: 'Demo', world });
    expect(m.attachments).toEqual([]);
    expect(m.html).toContain('has not appeared in Google results yet');
    expect(m.html).toContain('See details in Umami');
    expect(m.text).toContain('Statistics: https://umami.example.test/d');
    expect(m.html).not.toContain('Measured with Umami');
  });
});
describe('kit and HTTP routes', () => {
  const base = (over: Partial<StatsKitConfig> = {}): StatsKitConfig => ({ siteName: 'Example Workshop', timeZone: 'Europe/Paris', ...sources, fetch: fake, now: () => NOW, ...over });
  it('every route, overview cache', async () => {
    const send = vi.fn(async () => 3);
    const kit = createStatsKit(base({ report: { send, theme: { brand: '#1d3c9c' } }, sourceRequests: async () => ({ total: 1, bySubject: [] }) }));
    const get = async (path: string, query: Record<string, string> = {}) => {
      const r = await kit.handle({ method: 'get', path, query });
      return { status: r.status, body: r.headers['Content-Type'].startsWith('application/json') ? JSON.parse(r.body) : r.body, headers: r.headers };
    };
    const o = await get('/overview', { days: '7' });
    expect([o.status, o.body.status, o.body.range.days, o.headers['Cache-Control']]).toEqual([200, 'ok', 7, 'no-store']);
    expect((await get('/', { days: '7' })).body.generatedAt).toBe(o.body.generatedAt);
    expect((await get('/overview/', { from: '2026-11-01', to: '2026-11-07' })).body.range.days).toBe(7);
    expect((await get('/live')).body.active).toBeGreaterThan(0);
    expect((await get('/search', { days: '7' })).body.status).toBe('ok');
    expect((await get('/search/indexation')).body.total).toBe(9);
    const yt = (await get('/youtube', { days: '7' })).body;
    expect([yt.status, yt.days, yt.site.requests]).toEqual(['ok', 7, 1]);
    expect((await get('/youtube')).body.days).toBe(28);
    const pv = await get('/report/preview');
    expect(pv.body.subject).toMatch(/^Example Workshop — traffic report/);
    expect(pv.body.html).toContain('data:image/png;base64,');
    const w = await get('/world.json');
    expect([w.status, w.headers['Cache-Control'], w.body.features.length > 100]).toEqual([200, 'public, max-age=604800', true]);
    const s = await kit.handle({ method: 'POST', path: '/report/send', query: { days: '7' } });
    expect([s.status, JSON.parse(s.body)]).toEqual([200, { version: 1, ok: true, recipients: 3, error: null }]);
    expect(send).toHaveBeenCalledOnce();
    expect((await get('/unknown')).status).toBe(404);
    expect((await kit.handle({ method: 'DELETE', path: '/overview', query: {} })).status).toBe(404);
    expect(kit.texts.stats.title).toBe('Statistics');
    expect((await kit.report({ from: '2026-11-01', to: '2026-11-07' })).subject).toContain('1 Nov');
    // texts read again at every report, over those given at creation; the pages keep the texts of the creation
    let footer = 'First footer';
    const edited = createStatsKit(base({ locale: 'fr', texts: { report: { title: 'Fréquentation', intro: 'Bonjour' }, stats: { title: 'Audience' } }, report: { texts: async () => ({ report: { footer, subjectWeekly: '{site} — semaine' } }) } }));
    const r1 = await edited.report({ days: 7 }, true);
    expect([r1.subject, r1.html.includes('Fréquentation'), r1.html.includes('Bonjour'), r1.html.includes('First footer')]).toEqual(['Example Workshop — semaine', true, true, true]);
    footer = 'Second footer';
    expect((await edited.report({ days: 7 }, true)).html).toContain('Second footer');
    expect(edited.texts.stats.title).toBe('Audience');
    const none = createStatsKit(base({ report: { texts: () => null } }));
    expect((await none.report()).subject).toMatch(/^Example Workshop — traffic report/);
    const fresh = createStatsKit(base({ report: { texts: () => ({ report: { title: 'Fresh' } }) } }));
    expect((await fresh.report()).html).toContain('Fresh');
    const noTop = createStatsKit(base({ fetch: tweak((url) => (url.includes('maxResults=1') ? new Response('', { status: 500 }) : null)) }));
    expect((await noTop.report()).html).not.toContain('Most viewed video');
  });
  it('site data read at every call, while the figures of Umami stay in cache', async () => {
    let n = 0;
    const kit = createStatsKit(base({ extras: async () => ({ tiles: [{ id: 'r', label: 'Requests', value: ++n, previous: null, sub: null, group: null, highlight: false }], tables: [], funnel: null }) }));
    const a = await kit.overview({ days: 7 });
    const b = await kit.overview({ days: 7 });
    expect([a.generatedAt === b.generatedAt, a.extras?.tiles[0].value, b.extras?.tiles[0].value]).toEqual([true, 1, 2]);
    // a request received after the cached answer counts: the site data covers the period up to now
    let t = NOW;
    const ends: string[] = [];
    const moving = createStatsKit(base({ now: () => t, extras: async (r) => (ends.push(r.to), null) }));
    await moving.overview({ days: 7 });
    t += 60_000;
    await moving.overview({ days: 7 });
    expect(ends).toEqual([new Date(NOW).toISOString(), new Date(NOW + 60_000).toISOString()]);
    const off = createStatsKit({ siteName: 'S', umami: null, now: () => NOW, extras: async () => ({ tiles: [], tables: [], funnel: { label: 'End', value: 3 } }) });
    expect((await off.overview()).extras?.funnel?.value).toBe(3);
  });
  it('overview in error: not kept in cache, read again at the next call', async () => {
    let down = true, calls = 0;
    const kit = createStatsKit(base({ fetch: tweak((url) => {
      if (url.includes('/stats')) calls++;
      return down && url.includes('/stats') ? new Response('down', { status: 503 }) : null;
    }) }));
    const first = await kit.overview({ days: 7 });
    expect(first.status).toBe('error');
    down = false;
    const second = await kit.overview({ days: 7 });
    expect(second.status).toBe('ok');
    const n = calls;
    expect((await kit.overview({ days: 7 })).generatedAt).toBe(second.generatedAt); // a good answer stays in cache
    expect(calls).toBe(n);
  });
  it('site cards of the report: given by the site, a failure leaves the report without them', async () => {
    const blocks = vi.fn(async (o: StatsOverview) => [{ title: `Costs over ${o.range.days} days`, lines: ['$14.30'] }]);
    expect((await createStatsKit(base({ report: { blocks, glance: false } })).report({ days: 7 })).html).toContain('Costs over 7 days');
    expect(blocks).toHaveBeenCalledTimes(1);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const m = await createStatsKit(base({ report: { blocks: () => { throw new Error('db down'); } } })).report({ days: 7 });
    expect(m.html).toContain('At a glance');
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
  it('missing sources: "not configured" responses, sending refused (503), base map removed', async () => {
    const kit = createStatsKit({ siteName: 'Empty', world: null, umami: null, now: () => NOW });
    const j = async (path: string) => JSON.parse((await kit.handle({ method: 'GET', path, query: {} })).body);
    expect((await j('/overview')).status).toBe('not-configured');
    expect((await j('/live')).active).toBeNull();
    expect((await j('/search')).status).toBe('not-configured');
    expect((await j('/search/indexation')).status).toBe('not-configured');
    expect((await j('/youtube')).status).toBe('not-configured');
    expect((await kit.handle({ method: 'GET', path: '/world.json', query: {} })).status).toBe(404);
    const r = await kit.handle({ method: 'POST', path: '/report/send', query: {} });
    expect([r.status, JSON.parse(r.body).error]).toEqual([503, 'send-not-configured']);
    expect((await kit.report()).attachments).toEqual([]);
  });
  it('failed sending (502), live count down, internal error (500), base map given or unreadable', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const world = { features: [] };
    const kit = createStatsKit(base({ world, report: { send: async () => { throw new Error('smtp refused'); }, search: false, youtube: false } }));
    const r = await kit.handle({ method: 'POST', path: '/report/send', query: {} });
    expect([r.status, JSON.parse(r.body).error]).toEqual([502, 'smtp refused']);
    expect(kit.worldJson()).toBe('{"features":[]}');
    await expect(createStatsKit(base({ report: { send: async () => undefined } })).sendReport()).resolves.toMatchObject({ ok: true, recipients: 0 });
    const down = createStatsKit(base({ fetch: tweak((url) => (url.includes('/active') ? new Response('', { status: 500 }) : null)) }));
    expect((await down.live()).active).toBeNull();
    const boom = createStatsKit(base({ world: 'missing-file.json', extras: async () => { throw new Error('x'); } }));
    expect(boom.worldJson()).toBeNull();
    expect((await boom.report()).attachments.map((a) => a.cid)).toEqual([]);
    const crash = createStatsKit(base());
    vi.spyOn(crash, 'overview');
    const badHandle = await createStatsKit({ ...base(), timeZone: 'Not/A_Zone' }).handle({ method: 'GET', path: '/overview', query: {} });
    expect(badHandle.status).toBe(500);
    err.mockRestore();
    const noDash = createStatsKit(base({ umami: { ...umamiCfg, dashboardUrl: false } }));
    expect((await noDash.overview({ days: 7 })).dashboardUrl).toBeNull();
    const defaultDash = createStatsKit(base({ umami: { ...umamiCfg, dashboardUrl: undefined } }));
    expect((await defaultDash.overview({ days: 7 })).dashboardUrl).toBe(`${FAKE.umami}/websites/${FAKE.websiteId}`);
    expect(createStatsKit({ siteName: 'x', fetch: undefined }).texts.locale).toBe('en-GB');
    expect(createStatsKit({ siteName: 'x', locale: 'de-CH' }).texts).toMatchObject({ locale: 'de-CH', stats: { title: 'Statistiken' } });
    await expect(createStatsKit({ siteName: 'x', umami: { url: 'https://umami.example.test', websiteId: 'w', apiKey: 'k' } }).live()).resolves.toMatchObject({ active: null });
  });
  it('node:http / Express middleware', async () => {
    const kit = createStatsKit(base());
    const mw = kit.middleware();
    const server = createServer((req, res) => mw(req, res, () => ((res.statusCode = 418), res.end('next'))));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as { port: number }).port;
    const live = await fetch(`http://127.0.0.1:${port}/live`);
    expect([live.status, live.headers.get('content-type'), ((await live.json()) as { version: number }).version]).toEqual([200, 'application/json; charset=utf-8', 1]);
    const next = await fetch(`http://127.0.0.1:${port}/elsewhere`);
    expect([next.status, await next.text()]).toEqual([418, 'next']);
    server.close();
    const res = { statusCode: 0, headers: {} as Record<string, string>, body: '', setHeader(k: string, v: string) { this.headers[k] = v; }, end(b?: string) { this.body = b ?? ''; } };
    await new Promise<void>((done) => { res.end = function (b?: string) { this.body = b ?? ''; done(); }; mw({}, res); });
    expect([res.statusCode, JSON.parse(res.body).status]).toEqual([200, 'ok']);
    const res2 = { ...res, statusCode: 0, body: '' };
    await new Promise<void>((done) => { res2.end = function (b?: string) { this.body = b ?? ''; done(); }; mw({ url: '/nowhere', method: 'GET' }, res2); });
    expect(res2.statusCode).toBe(404);
    const failing = { statusCode: 0, setHeader() { throw new Error('headers already sent'); }, end: vi.fn() };
    const nextErr = vi.fn();
    mw({ url: '/live' }, failing, nextErr);
    await vi.waitFor(() => expect(nextErr).toHaveBeenCalledWith(expect.any(Error)));
    const failing2 = { statusCode: 0, setHeader() { throw new Error('x'); }, end: vi.fn() };
    mw({ url: '/live' }, failing2);
    await vi.waitFor(() => expect(failing2.statusCode).toBe(500));
  });
});
