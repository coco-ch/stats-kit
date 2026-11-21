import { createServer } from 'node:http';
import { inflateSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { textes, type StatsOverview } from 'stats-kit/contrat';
import { buildOverview, buildReport, createStatsKit, gscClient, loadWorld, previewHtml, renderWorldMap, resolveRange, umamiClient, youtubeClient, type Fetch, type StatsKitConfig } from 'stats-kit/serveur';
import { sourceVisits } from '../src/apercu.ts';
import { FAUX, fauxFetch, fauxSources } from '../../../demo/faux/services.ts';

const NOW = Date.parse('2026-11-16T10:30:00Z');
const faux = fauxFetch({ now: () => NOW });
const sources = await fauxSources();
const umamiCfg = sources.umami;

/** `fetch` qui répond une fois quelque chose de particulier, puis laisse la main au faux service. */
const tweak = (match: (url: string, init?: RequestInit) => Response | null): Fetch => async (url, init) => match(url, init) ?? faux(url, init);

describe('connecteur Umami', () => {
  it('se connecte une seule fois pour des appels simultanés et se reconnecte sur 401', async () => {
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
  it('refuse un mauvais compte', async () => {
    await expect(umamiClient({ ...umamiCfg, password: 'faux' }, faux).get('stats')).rejects.toThrow('umami login 401');
  });
  it('clé d’API (Umami Cloud) : pas de connexion', async () => {
    const seen: string[] = [];
    const f: Fetch = async (url, init) => (seen.push(`${url} ${new Headers(init?.headers).get('x-umami-api-key')}`), new Response('{"visitors":1}'));
    await umamiClient({ url: 'https://api.umami.exemple.test/v1/', websiteId: 'w', apiKey: 'cle' }, f).get('active');
    expect(seen).toEqual(['https://api.umami.exemple.test/v1/websites/w/active cle']);
  });
  it('« path » devient « url » sur un Umami 2, une fois pour toutes', async () => {
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

describe('vue d’ensemble', () => {
  const opts = { timeZone: 'Europe/Paris', pages: { languages: ['fr', 'en', 'de'], labels: { '/': 'Accueil' }, groups: [{ id: 'p', title: 'Fiches', pattern: /^\/produits\/(.+)$/ }] }, events: { labels: { 'clic-telephone': 'Appel' } }, goals: [{ id: 'tel', label: 'Appels', events: ['clic-telephone'] }], dashboardUrl: 'https://umami.exemple.test/websites/x' };
  it('rassemble toutes les données d’une période, cohérentes entre elles', async () => {
    const range = resolveRange({ days: 30 }, 'Europe/Paris', NOW);
    const o = await buildOverview(umamiClient(umamiCfg, faux), range, opts, NOW);
    expect(o.status).toBe('ok');
    expect(o.series.slots).toHaveLength(31);
    expect(o.series.pageviews.reduce((a, b) => a + b, 0)).toBe(o.totals.pageviews);
    expect(o.series.previousPageviews).toHaveLength(31);
    expect(o.last24h.slots).toHaveLength(25); // première et dernière heures entamées
    expect(o.heatmap.flat().reduce((a, b) => a + b, 0)).toBe(o.totals.pageviews);
    expect(o.breakdowns.pages[0]).toMatchObject({ key: '/', label: 'Accueil' });
    expect(o.breakdowns.pages.some((p) => p.key.startsWith('/admin'))).toBe(false);
    expect(o.breakdowns.siteLanguages.map((l) => l.key)).toEqual(['fr', 'en', 'de']);
    expect(o.breakdowns.events.find((e) => e.key === 'clic-telephone')?.label).toBe('Appel');
    expect(o.goals[0]).toMatchObject({ id: 'tel', label: 'Appels' });
    expect(o.goals[0].value).toBeGreaterThan(0);
    expect(o.groups[0].items.map((i) => i.key)).toContain('table-chene');
    expect(o.pages[0]).toMatchObject({ key: '/', label: 'Accueil' });
    expect(o.sessions).toHaveLength(12);
    expect(o.counts.countries).toBe(15);
    expect(o.active).toBeGreaterThanOrEqual(2);
    expect(o.dashboardUrl).toBe(opts.dashboardUrl);
    expect(o.previous?.pageviews).toBeGreaterThan(0);
  });
  it('24 heures : série horaire, carte de chaleur tirée de la même série', async () => {
    const o = await buildOverview(umamiClient(umamiCfg, faux), resolveRange({ days: 1 }, 'UTC', NOW), { timeZone: 'UTC' }, NOW);
    expect([o.range.unit, o.series.unit, o.series.slots.length]).toEqual(['hour', 'hour', 25]);
  });
  it('compléments absents : la vue reste complète, valeurs vides', async () => {
    const f = tweak((url) => (/\/websites\/[^/]+\/stats\?/.test(url) || url.includes('/auth/login') ? null : new Response('', { status: 500 })));
    const o = await buildOverview(umamiClient(umamiCfg, f), resolveRange({ days: 7 }, 'UTC', NOW), { timeZone: 'UTC' }, NOW);
    expect([o.status, o.active, o.series.previousPageviews, o.breakdowns.countries, o.sessions, o.counts]).toEqual(['ok', null, null, [], [], { countries: null, events: null }]);
    expect(o.dashboardUrl).toBeNull();
  });
  it('Umami en panne : état « error », données du site gardées', async () => {
    const f = tweak((url) => (url.includes('/stats') ? new Response('', { status: 502 }) : null));
    const extras = vi.fn(async () => ({ tiles: [], tables: [], funnel: null }));
    const o = await buildOverview(umamiClient(umamiCfg, f), resolveRange({ days: 7 }, 'UTC', NOW), { timeZone: 'UTC', extras }, NOW);
    expect([o.status, o.error, o.extras]).toEqual(['error', 'umami stats 502', { tiles: [], tables: [], funnel: null }]);
  });
  it('sans Umami : « non configuré » ; données du site en échec : ignorées', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const o = await buildOverview(null, resolveRange({ days: 7 }, 'UTC', NOW), { timeZone: 'UTC', extras: async () => { throw new Error('base'); } }, NOW);
    expect([o.status, o.extras]).toEqual(['not-configured', null]);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
  it('visites venues d’une source suivie', async () => {
    const v = await sourceVisits(umamiClient(umamiCfg, faux), NOW - 7 * 86_400_000, NOW, 'youtube', { languages: ['fr', 'en', 'de'] });
    expect(v.visits).toBeGreaterThan(0);
    expect(v.referred).toBeGreaterThan(0);
    expect(v.landing[0].key).toBe('/');
    const none = await sourceVisits(umamiClient(umamiCfg, tweak((url) => (url.includes('referrer=') || url.includes('type=path') ? new Response('', { status: 400 }) : null))), 0, NOW, 'youtube');
    expect([none.referred, none.landing]).toEqual([null, []]);
  });
});

describe('Search Console', () => {
  it('performances, période précédente, compléments, plans du site, cache', async () => {
    const calls: string[] = [];
    const g = gscClient(sources.gsc, async (url, init) => (calls.push(url), faux(url, init)));
    const p = await g.overview({ days: 28 }, NOW);
    expect([p.status, p.days, p.end, p.property, p.serviceAccount]).toEqual(['ok', 28, '2026-11-14', 'sc-domain:exemple.test', 'lecture-stats@projet-demo.iam.exemple.test']);
    expect(p.series).toHaveLength(28);
    expect(p.totals.impressions).toBe(p.series.reduce((n, d) => n + d.impressions, 0));
    expect([p.queries.length > 10, p.pages[0].key, p.countries[0].key, p.devices.length, p.queryPages.length > 10, p.appearance.length, p.sitemaps?.[0].indexed]).toEqual([true, `${FAUX.site}/fr`, 'fra', 3, true, 2, 14]);
    const n = calls.length;
    await g.overview({ days: 28 }, NOW);
    expect(calls.length).toBe(n); // gardé en cache
    g.reset();
  });
  it('OAuth, refus et erreurs lisibles', async () => {
    const oauth = { property: 'sc-domain:exemple.test', oauth: { client_id: 'i', client_secret: 's', refresh_token: 'r' }, apiUrl: `${FAUX.google}/webmasters/v3`, tokenUrl: `${FAUX.google}/token` };
    const bodies: string[] = [];
    const ok = await gscClient(oauth, async (url, init) => (url.endsWith('/token') && bodies.push(String(init?.body)), faux(url, init))).overview({ days: 7 }, NOW);
    expect([ok.status, ok.serviceAccount]).toEqual(['ok', null]);
    expect(bodies[0]).toContain('grant_type=refresh_token');
    const denied = await gscClient(oauth, tweak((url) => (url.includes('searchAnalytics') ? new Response('denied', { status: 403 }) : null))).overview({ days: 7 }, NOW);
    expect([denied.status, denied.error]).toEqual(['error', 'gsc 403 (accès refusé : droit manquant sur la propriété, ou API Search Console non activée) denied']);
    const partial = await gscClient(oauth, tweak((url, init) => (String(init?.body ?? '').includes('searchAppearance') || url.endsWith('/sitemaps') ? new Response('', { status: 500 }) : null))).overview({ days: 7 }, NOW);
    expect([partial.status, partial.appearance, partial.sitemaps]).toEqual(['ok', [], null]);
    const noRows = await gscClient(oauth, tweak((url) => (url.includes('searchAnalytics') ? new Response('{}') : url.endsWith('/sitemaps') ? new Response('{"sitemap":[{"path":"p"}]}') : null))).overview({ days: 7 }, NOW);
    expect([noRows.totals.clicks, noRows.series, noRows.sitemaps?.[0]]).toEqual([0, [], { path: 'p', lastDownloaded: null, errors: 0, warnings: 0, pending: false, submitted: 0, indexed: null }]);
    expect((await gscClient({ ...oauth, apiUrl: undefined, tokenUrl: undefined }, tweak((url) => (url.startsWith('https://oauth2.googleapis.com') ? new Response('{"access_token":"t","expires_in":60}') : url.startsWith('https://www.googleapis.com') ? new Response('{}') : null))).overview({}, NOW)).status).toBe('ok');
  });
  it('indexation page par page, filtrée, gardée en cache', async () => {
    const g = gscClient({ ...sources.gsc, indexationFilter: (u) => !u.endsWith('/en') }, faux);
    const ix = await g.indexation(NOW);
    expect([ix.status, ix.total, ix.indexed]).toEqual(['ok', 8, 6]);
    expect(ix.pages.find((p) => p.url.endsWith('/plan-du-site'))).toMatchObject({ indexed: false, verdict: 'NEUTRAL', lastCrawl: null });
    expect((await g.indexation(NOW)).checkedAt).toBe(ix.checkedAt);
    expect((await gscClient({ ...sources.gsc, sitemapUrl: undefined }, faux).indexation()).status).toBe('not-configured');
    expect((await gscClient(sources.gsc, tweak((url) => (url.endsWith('sitemap.xml') ? new Response('', { status: 404 }) : null))).indexation()).error).toBe('sitemap 404');
    const broken = await gscClient(sources.gsc, tweak((url) => (url.endsWith('/inspect') ? new Response('', { status: 429 }) : url.endsWith('/sitemap.xml') ? new Response('<loc>https://x/a</loc>') : null))).indexation();
    expect(broken.pages[0]).toMatchObject({ verdict: 'ERROR', indexed: false });
    const empty = await gscClient(sources.gsc, tweak((url) => (url.endsWith('/inspect') ? new Response('{}') : url.endsWith('/sitemap.xml') ? new Response('<loc>https://x/a</loc>') : null))).indexation();
    expect(empty.pages[0]).toMatchObject({ verdict: 'UNKNOWN', state: '—' });
  });
});

describe('YouTube', () => {
  it('chaîne, vidéos, 180 jours, période, provenance, côté site', async () => {
    const y = youtubeClient({ ...sources.youtube, videoLabel: (v) => (v.id === 'vid-chene-02' ? 'Film du chêne' : null), extraVideoIds: async () => ['vid-atelier-01'] }, faux);
    const site = { visits: async () => ({ visits: 5, visitors: 4, referred: 6, landing: [] }), requests: async () => ({ total: 2, bySubject: [] }) };
    const o = await y.overview(28, site, NOW);
    expect([o.status, o.channel?.handle, o.channel?.url, o.videos.length, o.series.length, o.days, o.end, o.traffic[0].source, o.site?.requests]).toEqual(['ok', '@atelier-exemple', 'https://www.youtube.com/@atelier-exemple', 4, 180, 28, '2026-11-15', 'YT_SEARCH', 2]);
    expect(o.videos[0].publishedAt! > o.videos[3].publishedAt!).toBe(true);
    expect(o.videos.find((v) => v.id === 'vid-chene-02')).toMatchObject({ label: 'Film du chêne', duration: 520, minutes: 7800 });
    expect(o.totals.views).toBe(o.series.slice(-28).reduce((n, d) => n + d.views, 0));
    expect(await y.topVideo(o.start, o.end)).toMatchObject({ title: 'Visite de l’atelier en trois minutes', views: 4100 });
    expect((await y.overview(500, undefined, NOW)).days).toBe(90);
    expect((await y.overview(Number.NaN, undefined, NOW)).days).toBe(28);
    y.reset();
  });
  it('mauvaise chaîne, jeton révoqué, Analytics refusé, chaîne vide', async () => {
    expect((await youtubeClient({ ...sources.youtube, channelId: 'autre' }, faux).overview(28, undefined, NOW)).error).toContain('pas à la chaîne attendue');
    const revoked = await youtubeClient(sources.youtube, tweak((url) => (url.endsWith('/token') ? new Response('{"error":"invalid_grant"}', { status: 400 }) : null))).overview(28);
    expect([revoked.status, revoked.error]).toEqual(['error', 'youtube token 400 (autorisation révoquée ou expirée : le propriétaire de la chaîne doit autoriser de nouveau l’accès)']);
    expect((await youtubeClient(sources.youtube, tweak((url) => (url.endsWith('/token') ? new Response('{"error":"other"}', { status: 401 }) : null))).overview(28)).error).toBe('youtube token 401 other');
    expect((await youtubeClient(sources.youtube, tweak((url) => (url.endsWith('/token') ? new Response('nope', { status: 500 }) : null))).overview(28)).error).toBe('youtube token 500');
    const noAnalytics = await youtubeClient(sources.youtube, tweak((url) => (url.includes('/v2/reports') ? new Response('quota', { status: 403 }) : null))).overview(28, undefined, NOW);
    expect([noAnalytics.status, noAnalytics.analyticsError?.startsWith('youtube 403 (accès refusé'), noAnalytics.videos[0].minutes]).toEqual(['ok', true, null]);
    expect((await youtubeClient(sources.youtube, tweak((url) => (url.includes('/channels') ? new Response('{"items":[]}') : null))).overview(28)).error).toBe('aucune chaîne pour ce compte Google');
    const bare = await youtubeClient({ ...sources.youtube, channelId: undefined }, tweak((url) => (url.includes('/channels') ? new Response(`{"items":[{"id":"UCx","snippet":{"thumbnails":{"default":{"url":"t"}}},"statistics":{"hiddenSubscriberCount":true}}]}`) : null))).overview(7, undefined, NOW);
    expect([bare.channel?.title, bare.channel?.url, bare.channel?.subscribers, bare.channel?.thumbnail, bare.videos]).toEqual(['UCx', 'https://www.youtube.com/channel/UCx', null, 't', []]);
    const handle = await youtubeClient({ ...sources.youtube, channelId: undefined }, tweak((url) => (url.includes('/channels') ? new Response('{"items":[{"id":"UCy","snippet":{"customUrl":"chaine"}}]}') : null))).overview(7, undefined, NOW);
    expect(handle.channel?.url).toBe('https://www.youtube.com/@chaine');
    const raw = await youtubeClient({ ...sources.youtube, channelId: undefined, apiUrl: undefined, analyticsUrl: undefined, tokenUrl: undefined }, async (url) => new Response(url.includes('oauth2') ? '{"access_token":"t","expires_in":60}' : url.includes('/channels') ? '{"items":[{"id":"UCz","contentDetails":{"relatedPlaylists":{"uploads":"U"}}}]}' : url.includes('/videos') ? '{"items":[{"id":"v1"}]}' : url.includes('/playlistItems') ? '{"items":[{"contentDetails":{"videoId":"v1"}},{}]}' : '{}')).overview(7, undefined, NOW);
    expect(raw.videos[0]).toMatchObject({ id: 'v1', title: 'v1', visibility: 'public', views: 0, likes: null, duration: 0 });
    expect(await youtubeClient(sources.youtube, tweak((url) => (url.includes('dimensions=video') && url.includes('maxResults=1') ? new Response('{"rows":[]}') : null))).topVideo('2026-11-01', '2026-11-07')).toBeNull();
  });
});

describe('rapport', () => {
  const texts = textes('fr');
  const overview = async (days = 7) => buildOverview(umamiClient(umamiCfg, faux), resolveRange({ days }, 'Europe/Paris', NOW), { timeZone: 'Europe/Paris', goals: [{ id: 'tel', label: 'Appels', events: ['clic-telephone'] }] }, NOW);
  const world = loadWorld();
  it('carte PNG aux bonnes dimensions', () => {
    const map = renderWorldMap([{ key: 'fr', value: 10 }, { key: 'FR', value: 2 }, { key: 'LU', value: 3 }, { key: 'ZZ', value: 1 }], { features: [...world.features.slice(0, 40), { properties: { iso2: 'XX' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 0]]] } }] }, { background: [1, 2, 3], land: [4, 5, 6], border: [7, 8, 9], low: [10, 11, 12], high: [13, 14, 15] }, 360);
    expect([map.width, map.height, map.png.readUInt32BE(16), map.png.readUInt32BE(20)]).toEqual([360, 142, 360, 142]);
    const idat = map.png.indexOf('IDAT');
    expect(inflateSync(map.png.subarray(idat + 4, idat + 4 + map.png.readUInt32BE(idat - 4))).length).toBe((360 * 3 + 1) * 142);
  });
  it('complet : chiffres, objectifs, données du site, carte, Google, YouTube, logo joint', async () => {
    const o: StatsOverview = { ...(await overview()), extras: { tiles: [{ id: 'd', label: 'Demandes', value: 12, previous: 10, sub: null, group: null, highlight: false }, { id: 't', label: 'À traiter', value: '3', previous: null, sub: 'en attente', group: null, highlight: true }, { id: 's', label: 'Texte', value: 'ok', previous: null, sub: 'sous', group: null, highlight: false }], tables: [{ id: 'x', title: 'Sujets', sub: 'par sujet', head: 'Sujet', column: 'Demandes', section: 'actions', items: [{ key: 'a', label: null, value: 2, previous: null }] }], funnel: null } };
    const search = await gscClient(sources.gsc, faux).overview({ days: 7 }, NOW);
    const yt = youtubeClient(sources.youtube, faux);
    const youtube = await yt.overview(7, { visits: async () => ({ visits: 5, visitors: 4, referred: 1, landing: [] }), requests: async () => ({ total: 1, bySubject: [] }) }, NOW);
    const m = buildReport({ overview: o, search, youtube, youtubeTop: { title: 'Film <1>', url: 'https://youtube.exemple.test/v', views: 9 }, texts: textes('fr', { report: { intro: 'Bonjour,\nvoici le rapport.' } }), theme: { brand: '#1d3c9c', logo: { png: new Uint8Array([1, 2, 3]), alt: 'Logo' } }, siteName: 'Atelier Exemple', statsUrl: 'https://www.exemple.test/admin', weekly: true, world });
    expect(m.subject).toBe('Atelier Exemple — rapport hebdomadaire de fréquentation');
    expect(m.attachments.map((a) => a.cid)).toEqual(['stats-kit-logo', 'stats-kit-carte']);
    for (const s of ['width="760"', 'cid:stats-kit-carte', 'cid:stats-kit-logo', 'Appels', 'Demandes', 'À traiter : 3', 'Dans Google', 'Sur YouTube', 'Film &#60;1&#62;', 'Sujets', 'Bonjour,<br>voici', 'Voir toutes les statistiques', '<!--[if mso]>']) expect(m.html).toContain(s);
    expect(m.html).not.toMatch(/<script|<svg/i);
    for (const s of ['Visiteurs :', 'DANS GOOGLE', 'SUR YOUTUBE', 'Statistiques : https://www.exemple.test/admin', 'Vidéo la plus vue : Film <1>']) expect(m.text).toContain(s);
    const preview = previewHtml(m);
    expect(preview).toContain('data:image/png;base64,');
    expect(preview).not.toContain('cid:');
  });
  it('dégradé : Umami absent ou en panne, Google et YouTube en panne, logo en ligne, sans bouton', async () => {
    const range = resolveRange({ days: 7 }, 'UTC', NOW);
    const off = await buildOverview(null, range, { timeZone: 'UTC' }, NOW);
    const g = { ...(await gscClient(sources.gsc, faux).overview({ days: 7 }, NOW)), status: 'error' as const };
    const y = { ...(await youtubeClient(sources.youtube, faux).overview(7, undefined, NOW)), status: 'error' as const };
    const m = buildReport({ overview: off, search: g, youtube: y, texts, theme: { brand: '#000000', logo: { url: 'https://www.exemple.test/logo.png', width: 90, height: 30 } }, siteName: 'Site', world: null });
    expect(m.attachments).toEqual([]);
    for (const s of ['ne sont pas branchées', 'momentanément indisponibles.', 'https://www.exemple.test/logo.png', 'height="30"']) expect(m.html).toContain(s);
    expect(m.html).not.toContain('Voir toutes');
    expect(m.subject).toMatch(/^Site — rapport de fréquentation \(/);
    const broken = { ...off, status: 'error' as const };
    expect(buildReport({ overview: broken, texts, theme: { brand: '#000000' }, siteName: 'S', world, statsUrl: null }).html).toContain('momentanément indisponibles');
  });
  it('sans visites, sans pays, sans affichage Google ; tableau de bord Umami en repli ; texte anglais', async () => {
    const o = await overview(1);
    const quiet: StatsOverview = { ...o, totals: { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 }, previous: null, series: { ...o.series, pageviews: o.series.pageviews.map(() => 0) }, heatmap: o.heatmap.map((r) => r.map(() => 0)), breakdowns: { ...o.breakdowns, countries: [] }, goals: [], dashboardUrl: 'https://umami.exemple.test/d' };
    const search = await gscClient(sources.gsc, faux).overview({ days: 7 }, NOW);
    const m = buildReport({ overview: quiet, search: { ...search, totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 } }, youtube: null, texts: textes('en', { report: { footer: '' } }), theme: { brand: '#2244aa' }, siteName: 'Demo', world });
    expect(m.attachments).toEqual([]);
    expect(m.html).toContain('has not appeared in Google results yet');
    expect(m.html).toContain('See details in Umami');
    expect(m.text).toContain('Statistics: https://umami.exemple.test/d');
    expect(m.html).not.toContain('Measured with Umami');
  });
});

describe('kit et routes HTTP', () => {
  const base = (over: Partial<StatsKitConfig> = {}): StatsKitConfig => ({ siteName: 'Atelier Exemple', timeZone: 'Europe/Paris', ...sources, fetch: faux, now: () => NOW, ...over });
  it('toutes les routes, cache de la vue d’ensemble', async () => {
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
    expect(pv.body.subject).toMatch(/^Atelier Exemple — rapport de fréquentation/);
    expect(pv.body.html).toContain('data:image/png;base64,');
    const w = await get('/world.json');
    expect([w.status, w.headers['Cache-Control'], w.body.features.length > 100]).toEqual([200, 'public, max-age=604800', true]);
    const s = await kit.handle({ method: 'POST', path: '/report/send', query: { days: '7' } });
    expect([s.status, JSON.parse(s.body)]).toEqual([200, { version: 1, ok: true, recipients: 3, error: null }]);
    expect(send).toHaveBeenCalledOnce();
    expect((await get('/inconnu')).status).toBe(404);
    expect((await kit.handle({ method: 'DELETE', path: '/overview', query: {} })).status).toBe(404);
    expect(kit.texts.stats.title).toBe('Statistiques');
    expect((await kit.report({ from: '2026-11-01', to: '2026-11-07' })).subject).toContain('1 nov.');
    const noTop = createStatsKit(base({ fetch: tweak((url) => (url.includes('maxResults=1') ? new Response('', { status: 500 }) : null)) }));
    expect((await noTop.report()).html).not.toContain('Vidéo la plus vue');
  });
  it('sources absentes : réponses « non configuré », envoi refusé (503), fond de carte retiré', async () => {
    const kit = createStatsKit({ siteName: 'Vide', world: null, umami: null, now: () => NOW });
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
  it('envoi en échec (502), direct en panne, erreur interne (500), fond de carte fourni ou illisible', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const world = { features: [] };
    const kit = createStatsKit(base({ world, report: { send: async () => { throw new Error('smtp refusé'); }, search: false, youtube: false } }));
    const r = await kit.handle({ method: 'POST', path: '/report/send', query: {} });
    expect([r.status, JSON.parse(r.body).error]).toEqual([502, 'smtp refusé']);
    expect(kit.worldJson()).toBe('{"features":[]}');
    await expect(createStatsKit(base({ report: { send: async () => undefined } })).sendReport()).resolves.toMatchObject({ ok: true, recipients: 0 });
    const down = createStatsKit(base({ fetch: tweak((url) => (url.includes('/active') ? new Response('', { status: 500 }) : null)) }));
    expect((await down.live()).active).toBeNull();
    const boom = createStatsKit(base({ world: 'fichier-absent.json', extras: async () => { throw new Error('x'); } }));
    expect(boom.worldJson()).toBeNull();
    expect((await boom.report()).attachments.map((a) => a.cid)).toEqual([]);
    const crash = createStatsKit(base());
    vi.spyOn(crash, 'overview');
    const badHandle = await createStatsKit({ ...base(), timeZone: 'Pas/Un_Fuseau' }).handle({ method: 'GET', path: '/overview', query: {} });
    expect(badHandle.status).toBe(500);
    err.mockRestore();
    const noDash = createStatsKit(base({ umami: { ...umamiCfg, dashboardUrl: false } }));
    expect((await noDash.overview({ days: 7 })).dashboardUrl).toBeNull();
    const defaultDash = createStatsKit(base({ umami: { ...umamiCfg, dashboardUrl: undefined } }));
    expect((await defaultDash.overview({ days: 7 })).dashboardUrl).toBe(`${FAUX.umami}/websites/${FAUX.websiteId}`);
    expect(createStatsKit({ siteName: 'x', fetch: undefined }).texts.locale).toBe('fr-FR');
    await expect(createStatsKit({ siteName: 'x', umami: { url: 'https://umami.exemple.test', websiteId: 'w', apiKey: 'k' } }).live()).resolves.toMatchObject({ active: null });
  });
  it('intergiciel node:http / Express', async () => {
    const kit = createStatsKit(base());
    const mw = kit.middleware();
    const server = createServer((req, res) => mw(req, res, () => ((res.statusCode = 418), res.end('suite'))));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as { port: number }).port;
    const live = await fetch(`http://127.0.0.1:${port}/live`);
    expect([live.status, live.headers.get('content-type'), ((await live.json()) as { version: number }).version]).toEqual([200, 'application/json; charset=utf-8', 1]);
    const next = await fetch(`http://127.0.0.1:${port}/ailleurs`);
    expect([next.status, await next.text()]).toEqual([418, 'suite']);
    server.close();
    const res = { statusCode: 0, headers: {} as Record<string, string>, body: '', setHeader(k: string, v: string) { this.headers[k] = v; }, end(b?: string) { this.body = b ?? ''; } };
    await new Promise<void>((done) => { res.end = function (b?: string) { this.body = b ?? ''; done(); }; mw({}, res); });
    expect([res.statusCode, JSON.parse(res.body).status]).toEqual([200, 'ok']);
    const res2 = { ...res, statusCode: 0, body: '' };
    await new Promise<void>((done) => { res2.end = function (b?: string) { this.body = b ?? ''; done(); }; mw({ url: '/nulle-part', method: 'GET' }, res2); });
    expect(res2.statusCode).toBe(404);
    const failing = { statusCode: 0, setHeader() { throw new Error('en-têtes déjà partis'); }, end: vi.fn() };
    const nextErr = vi.fn();
    mw({ url: '/live' }, failing, nextErr);
    await vi.waitFor(() => expect(nextErr).toHaveBeenCalledWith(expect.any(Error)));
    const failing2 = { statusCode: 0, setHeader() { throw new Error('x'); }, end: vi.fn() };
    mw({ url: '/live' }, failing2);
    await vi.waitFor(() => expect(failing2.statusCode).toBe(500));
  });
});
