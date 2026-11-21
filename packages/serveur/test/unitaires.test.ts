import { describe, expect, it, vi } from 'vitest';
import {
  Cache, SourceError, TokenHolder, alignSeries, encodePng, groupPaths, heatmap, isoSeconds, logicalPath, pageRows, parseCredentials, parseStats, palette,
  reportDue, resolveRange, searchPeriod, signJwt, slotOf, slotOfLabel, slotsBetween, startWeeklyReport, toItems, weekId, weeklyTick, zonedToInstant,
  gscFromEnv, umamiFromEnv, youtubeFromEnv, sourcesFromEnv, umamiConfigured, gscConfigured, youtubeConfigured,
} from 'stats-kit/serveur';
import { errorMessage, json, qs, settle } from '../src/http.ts';
import { labelOf, pageGroups, emptyOverview } from '../src/apercu.ts';
import { tableRows, siteSide } from '../src/youtube.ts';
import { offsetAt, ymd } from '../src/temps.ts';
import { rgb } from '../src/rapport/theme.ts';
import { esc, escLines } from '../src/rapport/kit.ts';
import { generateKeyPairSync, createVerify } from 'node:crypto';

const NOW = Date.parse('2026-11-16T10:30:00Z'); // lundi

describe('temps', () => {
  it('heure murale et instants, heure d’été comprise', () => {
    expect(slotOf(NOW, 'hour', 'Europe/Paris')).toBe('2026-11-16T11');
    expect(slotOf(NOW, 'day', 'America/New_York')).toBe('2026-11-16');
    expect(new Date(zonedToInstant(2026, 7, 1, 0, 'Europe/Paris')).toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(new Date(zonedToInstant(2026, 1, 1, 0, 'Europe/Paris')).toISOString()).toBe('2025-12-31T23:00:00.000Z');
    expect(offsetAt(NOW, 'UTC')).toBe(0);
    expect(ymd(NOW)).toBe('2026-11-16');
  });
  it('créneaux continus, y compris au changement d’heure', () => {
    expect(slotsBetween(NOW - 3 * 3_600_000, NOW, 'hour', 'UTC')).toEqual(['2026-11-16T07', '2026-11-16T08', '2026-11-16T09', '2026-11-16T10']);
    expect(slotsBetween(Date.parse('2026-10-24T22:00:00Z'), Date.parse('2026-10-26T23:00:00Z'), 'day', 'Europe/Paris')).toEqual(['2026-10-25', '2026-10-26']);
    expect(slotsBetween(Date.parse('2026-10-24T22:00:00Z'), Date.parse('2026-10-25T23:00:00Z'), 'hour', 'Europe/Paris')).toHaveLength(24); // 25 heures réelles, l'heure répétée (2 h) forme un seul créneau
  });
  it('lit les dates des sources (instants ou heures murales)', () => {
    expect(slotOfLabel('2026-11-16 09:00:00', 'hour', 'Europe/Paris')).toBe('2026-11-16T09');
    expect(slotOfLabel('2026-11-16T08:00:00Z', 'hour', 'Europe/Paris')).toBe('2026-11-16T09');
    expect(slotOfLabel('2026-11-15T23:30:00+00:00', 'day', 'Europe/Paris')).toBe('2026-11-16');
    expect(slotOfLabel('2026-11-16', 'hour', 'UTC')).toBe('2026-11-16T00');
    expect(slotOfLabel('nimporte+01:00', 'day', 'UTC')).toBe('nimporte+0');
  });
  it('périodes : jours, 24 heures, dates choisies, refus', () => {
    const r = resolveRange({ days: '7' }, 'UTC', NOW);
    expect([r.days, r.unit, r.to, r.previousTo === r.from]).toEqual([7, 'day', new Date(NOW).toISOString(), true]);
    expect(resolveRange({ days: 1 }, 'UTC', NOW).unit).toBe('hour');
    expect(resolveRange({ days: 'x' }, 'UTC', NOW).days).toBe(30);
    expect(resolveRange({}, 'UTC', NOW, 14).days).toBe(14);
    expect(resolveRange({ days: 9999 }, 'UTC', NOW).days).toBe(366);
    const c = resolveRange({ from: '2026-11-01', to: '2026-11-07' }, 'Europe/Paris', NOW);
    expect([c.from, c.to, c.days, c.previousFrom]).toEqual(['2026-10-31T23:00:00.000Z', '2026-11-07T23:00:00.000Z', 7, '2026-10-24T23:00:00.000Z']);
    expect(resolveRange({ from: '2026-11-15' }, 'UTC', NOW).to).toBe(new Date(NOW).toISOString());
    expect(resolveRange({ from: '2026-11-20', to: '2026-11-25' }, 'UTC', NOW).days).toBe(30); // dans le futur : refusé
    expect(resolveRange({ from: '2020-01-01', to: '2026-11-01' }, 'UTC', NOW).days).toBe(30); // plus d'un an : refusé
  });
  it('semaines ISO', () => {
    expect(weekId(NOW, 'Europe/Paris')).toBe('2026-W47');
    expect(weekId(Date.parse('2027-01-01T12:00:00Z'), 'UTC')).toBe('2026-W53');
  });
});

describe('outils HTTP', () => {
  it('cache : durée de vie, chargement partagé, plafond', async () => {
    let t = 0;
    const c = new Cache(() => t);
    const load = vi.fn(async () => t);
    const [a, b] = await Promise.all([c.get('k', 10, load), c.get('k', 10, load)]);
    expect([a, b, load.mock.calls.length]).toEqual([0, 0, 1]);
    t = 20;
    expect(await c.get('k', 10, load)).toBe(20);
    for (let i = 0; i < 205; i++) await c.get(`x${i}`, 10, async () => i);
    c.clear();
    expect(await c.get('k', 10, async () => 'neuf')).toBe('neuf');
    await expect(c.get('err', 10, async () => { throw new Error('non'); })).rejects.toThrow('non');
    expect(new Cache().constructor).toBe(Cache);
  });
  it('jeton : gardé, renouvelé avant expiration, oublié', async () => {
    let t = 0;
    const f = vi.fn(async () => ({ value: `j${f.mock.calls.length}`, expiresInMs: 120_000 }));
    const h = new TokenHolder(f, () => t);
    expect(await Promise.all([h.get(), h.get()])).toEqual(['j1', 'j1']);
    t = 30_000;
    expect(await h.get()).toBe('j1');
    t = 70_000;
    expect(await h.get()).toBe('j2');
    h.reset();
    expect(await h.get()).toBe('j3');
    expect(await new TokenHolder(async () => ({ value: 'v', expiresInMs: 1e9 })).get()).toBe('v');
  });
  it('réponses JSON, erreurs, paramètres', async () => {
    expect(await json(new Response('{"a":1}'), 'x')).toEqual({ a: 1 });
    await expect(json(new Response('refus', { status: 403 }), 'gsc', (s) => ` (${s})`)).rejects.toThrow('gsc 403 (403) refus');
    await expect(json(new Response('', { status: 500 }), 'x')).rejects.toMatchObject({ status: 500, message: 'x 500' });
    expect(new SourceError('m').status).toBeNull();
    await expect(json({ ok: false, status: 502, text: () => Promise.reject(new Error('flux')) } as unknown as Response, 'x')).rejects.toThrow('x 502');
    expect(errorMessage('texte')).toBe('texte');
    expect(errorMessage(new Error('e'))).toBe('e');
    expect(qs({ a: 1, b: undefined, c: 'x y' })).toBe('a=1&c=x+y');
    expect(await settle(Promise.reject(new Error()), 'repli')).toBe('repli');
  });
});

describe('agrégations', () => {
  it('chemins logiques, exclusions, langues', () => {
    expect(logicalPath('/fr/contact/?x=1', { languages: ['fr', 'en'] })).toEqual({ page: '/contact', lang: 'fr' });
    expect(logicalPath('/en', { languages: ['fr', 'en'] })).toEqual({ page: '/', lang: 'en' });
    expect(logicalPath('/de/x', { languages: ['fr'] })).toBeNull();
    expect(logicalPath('/admin/stats')).toBeNull();
    expect(logicalPath('/private', { exclude: /^\/private/ })).toBeNull();
    expect(logicalPath('')).toEqual({ page: '/', lang: null });
    expect(logicalPath('/a/b/')).toEqual({ page: '/a/b', lang: null });
  });
  it('libellés, classements, regroupements', () => {
    expect(labelOf(undefined, 'x')).toBeNull();
    expect(labelOf({ x: 'X' }, 'x')).toBe('X');
    expect(labelOf({}, 'y')).toBeNull();
    expect(labelOf((k) => (k === 'x' ? 'Ix' : undefined), 'x')).toBe('Ix');
    expect(labelOf(() => undefined, 'x')).toBeNull();
    expect(toItems([{ x: 'b', y: 1 }, { x: 'a', y: 1 }, { x: 'c', y: 5 }, { x: 'c', y: 1 }], [{ x: 'c', y: 2 }])).toEqual([
      { key: 'c', label: null, value: 6, previous: 2 }, { key: 'a', label: null, value: 1, previous: 0 }, { key: 'b', label: null, value: 1, previous: 0 }]);
    expect(toItems([{ x: undefined as unknown as string, y: 3 }])[0]).toEqual({ key: '', label: null, value: 3, previous: null });
    const g = groupPaths([{ x: '/fr/p/a', y: 2 }, { x: '/en/p/a', y: 1 }, { x: '/api/x', y: 9 }, { x: undefined as unknown as string, y: 1 }], { languages: ['fr', 'en'] });
    expect([...g.pages]).toEqual([['/p/a', 3]]);
    expect([...g.langs]).toEqual([['fr', 2], ['en', 1]]);
    expect(groupPaths([{ x: '/a', y: 1 }]).langs.size).toBe(0);
    const groups = pageGroups(new Map([['/p/a', 3], ['/p/b', 1], ['/autre', 4]]), new Map([['/p/a', 1]]), [{ id: 'p', title: 'Fiches', pattern: /^\/p\/([a-z]+)$/, labels: { a: 'Fiche A' } }, { id: 'tout', title: 'Tout', pattern: /^\/autre$/ }]);
    expect(groups[0].items).toEqual([{ key: 'a', label: 'Fiche A', value: 3, previous: 1 }, { key: 'b', label: null, value: 1, previous: 0 }]);
    expect(groups[1].items[0]).toMatchObject({ key: '/autre', value: 4 });
    expect(pageGroups(new Map([['/p/a', 1]]), null, [{ id: 'p', title: 'P', pattern: /^\/p\/(.+)$/ }])[0].items[0].previous).toBeNull();
    expect(pageGroups(new Map(), null)).toEqual([]);
  });
  it('détail des pages', () => {
    const e = (name: string, pageviews: number | string) => ({ name, pageviews, visitors: 2, visits: 3, bounces: 1, totaltime: 30 });
    const rows = pageRows([e('/fr/a', '10'), e('/en/a', 5), e('/admin', 4), e('/fr/b', 'x')], [e('/fr/a', 0), e('/api', 0)], [e('/fr/a', 0), e('/x/y', 0)], [{ x: '/fr/a', y: 7 }, { x: '/fr/zz', y: 1 }, { x: '/api', y: 1 }], { languages: ['fr', 'en'], labels: { '/a': 'A' } });
    expect(rows[0]).toEqual({ key: '/a', label: 'A', views: 15, visitors: 4, entries: 3, exits: 3, bounces: 1, totaltime: 60, previousViews: 7 });
    expect(rows[1]).toMatchObject({ key: '/b', views: 0 });
  });
  it('séries alignées et carte de chaleur', () => {
    expect(alignSeries(['2026-11-15', '2026-11-16'], [{ x: '2026-11-16 00:00:00', y: 4 }, { x: '2026-11-16 00:00:00', y: 1 }], 'day', 'UTC')).toEqual([0, 5]);
    expect(alignSeries(['a'], undefined, 'day', 'UTC')).toEqual([0]);
    const h = heatmap([{ x: '2026-11-16 09:00:00', y: 3 }, { x: '2026-11-22 23:00:00', y: 2 }, { x: 'mauvais', y: 9 }], 'UTC');
    expect([h[0][9], h[6][23], h.flat().reduce((a, b) => a + b, 0)]).toEqual([3, 2, 5]);
    expect(heatmap(undefined, 'UTC').flat().every((v) => v === 0)).toBe(true);
  });
  it('vue vide de même forme', () => {
    const o = emptyOverview(resolveRange({ days: 7 }, 'UTC', NOW), 'error', 'panne', NOW);
    expect([o.status, o.error, o.series.slots.length, o.last24h.slots.length, o.heatmap.length]).toEqual(['error', 'panne', 8, 25, 7]);
    expect(emptyOverview(resolveRange({ days: 7 }, 'UTC', NOW), 'not-configured', null).generatedAt).toBeTypeOf('string');
  });
  it('totaux Umami de toutes versions', () => {
    expect(parseStats({ pageviews: { value: 5, prev: 3 }, visitors: 2, visits: 'x' })).toEqual({ pageviews: 5, visitors: 2, visits: 0, bounces: 0, totaltime: 0 });
    expect(parseStats(null).pageviews).toBe(0);
    expect(parseStats({ pageviews: { value: 'x' } }).pageviews).toBe(0);
  });
});

describe('réglages', () => {
  it('lit les variables d’environnement', () => {
    expect(umamiFromEnv({})).toBeNull();
    expect(umamiFromEnv({ UMAMI_API_URL: 'u', UMAMI_WEBSITE_ID: 'w', UMAMI_USERNAME: 'n' })).toBeNull();
    expect(umamiFromEnv({ UMAMI_API_URL: 'u', UMAMI_WEBSITE_ID: 'w', UMAMI_API_KEY: 'k', UMAMI_DASHBOARD_URL: 'false' })).toMatchObject({ apiKey: 'k', dashboardUrl: false });
    expect(umamiFromEnv({ UMAMI_API_URL: 'u', UMAMI_WEBSITE_ID: 'w', UMAMI_USERNAME: 'n', UMAMI_PASSWORD: 'p', UMAMI_DASHBOARD_URL: 'https://d' })).toMatchObject({ dashboardUrl: 'https://d' });
    expect(umamiFromEnv({ UMAMI_API_URL: ' u ', UMAMI_WEBSITE_ID: 'w', UMAMI_USERNAME: 'n', UMAMI_PASSWORD: 'p' })).not.toHaveProperty('dashboardUrl');
    expect(gscFromEnv({ GSC_SITE: 's' })).toBeNull();
    expect(gscFromEnv({ GSC_SITE: 's', GSC_OAUTH: '{}' })).toMatchObject({ property: 's', oauth: '{}' });
    expect(youtubeFromEnv({ YOUTUBE_CLIENT_ID: 'a', YOUTUBE_CLIENT_SECRET: 'b' })).toBeNull();
    expect(youtubeFromEnv({ YOUTUBE_CLIENT_ID: 'a', YOUTUBE_CLIENT_SECRET: 'b', YOUTUBE_REFRESH_TOKEN: 'c' })).toMatchObject({ clientId: 'a' });
    expect(sourcesFromEnv({})).toEqual({ umami: null, gsc: null, youtube: null });
    expect(Object.keys(sourcesFromEnv())).toEqual(['umami', 'gsc', 'youtube']);
    expect(umamiFromEnv()).toBeNull();
    expect(gscFromEnv()).toBeNull();
    expect(youtubeFromEnv()).toBeNull();
  });
  it('sait si une source est configurée', () => {
    expect(umamiConfigured(null)).toBe(false);
    expect(umamiConfigured({ url: 'u', websiteId: 'w', apiKey: 'k' })).toBe(true);
    expect(gscConfigured({ property: 'p' })).toBe(false);
    expect(youtubeConfigured({ clientId: 'a', clientSecret: 'b', refreshToken: '' })).toBe(false);
  });
  it('identifiants Google en JSON, en base64 ou en objet', () => {
    const o = { client_id: 'i', client_secret: 's', refresh_token: 'r' };
    expect(parseCredentials(JSON.stringify(o), ['client_id', 'client_secret', 'refresh_token'])).toEqual(o);
    expect(parseCredentials(Buffer.from(JSON.stringify(o)).toString('base64'), ['client_id'])).toEqual(o);
    expect(parseCredentials(o, ['client_id'])).toEqual(o);
    expect(parseCredentials('{"client_id":""}', ['client_id'])).toBeNull();
    expect(parseCredentials('pas du json', ['client_id'])).toBeNull();
    expect(parseCredentials(undefined, ['client_id'])).toBeNull();
  });
  it('signe un JWT vérifiable', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwt = signJwt({ client_email: 'c@exemple.test', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() }, 'portée', NOW);
    const [h, c, s] = jwt.split('.');
    expect(JSON.parse(Buffer.from(c, 'base64url').toString())).toMatchObject({ iss: 'c@exemple.test', scope: 'portée', aud: 'https://oauth2.googleapis.com/token', exp: NOW / 1000 + 3600 });
    expect(createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(s, 'base64url'))).toBe(true);
    expect(signJwt({ client_email: 'c', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), token_uri: 'https://t' }).split('.')).toHaveLength(3);
  });
  it('période Search Console', () => {
    expect(searchPeriod({ days: 7 }, NOW)).toEqual({ days: 7, start: '2026-11-08', end: '2026-11-14', previousStart: '2026-11-01', previousEnd: '2026-11-07' });
    expect(searchPeriod({}, NOW).days).toBe(28);
    expect(searchPeriod({ days: 5000 }, NOW).days).toBe(480);
    expect(searchPeriod({ from: '2026-11-01', to: '2026-11-30' }, NOW)).toMatchObject({ days: 14, end: '2026-11-14', previousEnd: '2026-10-31' });
    expect(searchPeriod({ from: '2026-11-10', to: '2026-11-01' }, NOW).days).toBe(28);
  });
  it('YouTube : durées et tableaux', () => {
    expect(isoSeconds('PT1M20S')).toBe(80);
    expect(isoSeconds('P1DT1H')).toBe(90000);
    expect(isoSeconds('P0D')).toBe(0);
    expect(isoSeconds('x')).toBe(0);
    expect(isoSeconds(undefined)).toBe(0);
    expect(tableRows({ columnHeaders: [{ name: 'a' }, { name: 'b' }], rows: [[1, 'x']] })).toEqual([{ a: 1, b: 'x' }]);
    expect(tableRows({})).toEqual([]);
  });
  it('YouTube : ce que le site compte, avec erreurs tolérées', async () => {
    expect(await siteSide(undefined, 'youtube', 7, NOW)).toBeNull();
    expect(await siteSide({ visits: async () => { throw new Error('umami'); } }, 'youtube', 7, NOW)).toMatchObject({ visits: null, previousVisits: null });
    expect(await siteSide({ requests: async () => { throw new Error('base'); } }, 'youtube', 7, NOW)).toMatchObject({ visits: null, requests: null, landing: [] });
    expect(await siteSide({ visits: async () => ({ visits: 3, visitors: 2, referred: null, landing: [] }) }, 'youtube', 7, NOW)).toMatchObject({ visits: 3, previousVisits: 3, requests: null });
  });
});

describe('rapport : briques', () => {
  it('thème complet à partir d’une couleur', () => {
    const p = palette({ brand: '#336699' });
    expect([p.head, p.accentDeep, p.logo]).toEqual(['#336699', '#336699', null]);
    expect(palette({ brand: 'rouge' }).brand).toBe('#2f5bd3');
    expect(palette({ brand: '#000000', head: '#111111', ink: '#222222', logo: { url: 'u' } })).toMatchObject({ head: '#111111', ink: '#222222', logo: { url: 'u' } });
    expect(rgb('#ff8000')).toEqual([255, 128, 0]);
    expect(esc('<a href="x">\'&')).toBe('&#60;a href=&#34;x&#34;&#62;&#39;&#38;');
    expect(esc(null)).toBe('');
    expect(escLines('a\nb')).toBe('a<br>b');
  });
  it('PNG valide', () => {
    const png = encodePng(new Uint8Array([255, 0, 0, 0, 255, 0]), 2, 1);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.readUInt32BE(16)).toBe(2);
  });
});

describe('planification', () => {
  const s = { weekday: 1, hour: 8, timeZone: 'Europe/Paris' };
  it('sait quand envoyer', () => {
    expect(reportDue(Date.parse('2026-11-16T06:00:00Z'), null, s)).toBeNull(); // lundi 7 h
    expect(reportDue(Date.parse('2026-11-16T07:30:00Z'), null, s)).toBe('2026-W47');
    expect(reportDue(Date.parse('2026-11-16T07:30:00Z'), '2026-W47', s)).toBeNull();
    expect(reportDue(Date.parse('2026-11-18T07:30:00Z'), '2026-W46', s)).toBe('2026-W47'); // rattrapage en milieu de semaine
    expect(reportDue(Date.parse('2026-11-22T07:30:00Z'), null, { ...s, weekday: 7, hour: 10 })).toBeNull();
  });
  it('un passage : envoi, échec, nouvel essai une heure plus tard', async () => {
    let t = Date.parse('2026-11-16T09:00:00Z');
    let last: string | null = null;
    const log = vi.fn();
    const send = vi.fn().mockRejectedValueOnce(new Error('smtp')).mockResolvedValueOnce(false).mockResolvedValue(true);
    const tick = weeklyTick({ schedule: s, getLastSent: async () => last, setLastSent: async (w) => void (last = w), send, now: () => t, log });
    expect(await tick()).toBe('failed');
    expect(await tick()).toBe('skipped'); // moins d'une heure après
    t += 3_600_000;
    expect(await tick()).toBe('failed');
    t += 3_600_000;
    expect(await tick()).toBe('sent');
    expect(last).toBe('2026-W47');
    expect(await tick()).toBe('skipped');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('smtp'));
    expect(await weeklyTick({ schedule: s, getLastSent: async () => null, setLastSent: async () => {}, send: async () => { throw 'texte'; } })()).not.toBe('sent');
  });
  it('vérification périodique et arrêt', async () => {
    vi.useFakeTimers();
    const send = vi.fn(async () => true);
    const log = vi.fn();
    const stop = startWeeklyReport({ schedule: { weekday: 1, hour: 0, timeZone: 'UTC' }, getLastSent: async () => { throw new Error('base'); }, setLastSent: async () => {}, send, now: () => NOW, intervalMs: 1000, log });
    await vi.advanceTimersByTimeAsync(61_000);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('base'));
    stop();
    const stop2 = startWeeklyReport({ schedule: s, getLastSent: async () => null, setLastSent: async () => {}, send });
    stop2();
    vi.useRealTimers();
  });
});
