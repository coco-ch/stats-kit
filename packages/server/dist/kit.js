/*
 * Server entry point: `createStatsKit(settings)` connects the connectors, the cache, the report and the HTTP routes.
 * No framework imposed: `handle()` answers a simply described request; `middleware()` plugs into Express or `node:http`.
 */
import { readFileSync } from 'node:fs';
import { createTexts } from 'stats-kit/contract';
import { buildOverview, siteExtras, sourceVisits } from "./overview.js";
import { gscClient, gscConfigured, emptySearch, searchPeriod } from "./gsc.js";
import { Cache, errorMessage } from "./http.js";
import { dailyVisits, goalSeries } from "./report/daily.js";
import { buildReport, previewHtml } from "./report/report.js";
import { loadWorld, worldFile } from "./report/map-png.js";
import { resolveRange } from "./time.js";
import { umamiClient, umamiConfigured } from "./umami.js";
import { emptyYoutube, youtubeClient, youtubeConfigured } from "./youtube.js";
/** Overrides given at creation, completed section by section by those read at report time. */
function mergeOverrides(base, extra) {
    const out = { ...base };
    for (const [k, v] of Object.entries(extra)) {
        const b = out[k];
        out[k] = v && typeof v === 'object' && b && typeof b === 'object' ? { ...b, ...v } : v;
    }
    return out;
}
export function createStatsKit(config) {
    const now = config.now ?? Date.now;
    const tz = config.timeZone ?? 'UTC';
    const texts = createTexts(config.locale ?? 'en', config.texts, config.baseTexts);
    const fetchFn = config.fetch ?? ((input, init) => fetch(input, init));
    const umami = umamiConfigured(config.umami) ? umamiClient(config.umami, fetchFn) : null;
    const gsc = gscConfigured(config.gsc) ? gscClient({ languageCode: texts.locale, ...config.gsc }, fetchFn) : null;
    const yt = youtubeConfigured(config.youtube) ? youtubeClient(config.youtube, fetchFn) : null;
    const cache = new Cache(now);
    const ttl = config.cacheTtlMs ?? 120_000;
    const dashboardUrl = umami && config.umami?.dashboardUrl !== false
        ? (config.umami?.dashboardUrl || `${config.umami.url.replace(/\/+$/, '')}/websites/${config.umami.websiteId}`)
        : null;
    let world;
    let worldText;
    const getWorld = () => {
        if (world !== undefined)
            return world;
        try {
            const w = config.world;
            world = w === null ? null : w && typeof w === 'object' && 'features' in w ? w : loadWorld(w ?? undefined);
        }
        catch {
            world = null; // without a base map, the report is sent without a map rather than not at all
        }
        return world;
    };
    const overview = async (q = {}) => {
        const range = resolveRange(q, tz, now());
        const key = typeof q.from === 'string' ? `r:${range.from}:${range.to}` : `d:${range.days}`;
        // an answer in error (Umami unreachable, refused sign-in…) is not kept: the next call asks Umami again
        const o = await cache.get(`overview:${key}`, ttl, () => buildOverview(umami, range, { ...config, extras: undefined, timeZone: tz, dashboardUrl }, now()), (x) => x.status !== 'error');
        // the site's own data (its database: requests received, to handle…) is read at every call, never kept with Umami's figures
        return { ...o, extras: await siteExtras({ ...config, timeZone: tz }, range) }; // the period as of now, not as of the cached answer
    };
    const live = async () => {
        let active = null;
        if (umami) {
            try {
                const a = await umami.get('active');
                active = a.visitors ?? a.x ?? 0;
            }
            catch {
                active = null;
            }
        }
        return { version: 1, active, at: new Date(now()).toISOString() };
    };
    const search = (q = {}) => gsc ? gsc.overview(q, now()) : Promise.resolve(emptySearch('not-configured', null, searchPeriod(q, now()), config.gsc, now()));
    const indexation = async () => gsc ? gsc.indexation(now()) : { version: 1, status: 'not-configured', error: null, checkedAt: new Date(now()).toISOString(), total: 0, indexed: 0, pages: [] };
    const siteCounter = {
        visits: umami ? (a, b, source) => sourceVisits(umami, a, b, source, config.pages) : undefined,
        requests: config.sourceRequests,
    };
    const youtube = (days = 28) => yt ? yt.overview(days, siteCounter, now()) : Promise.resolve(emptyYoutube('not-configured', null, days, config.youtube?.channelUrl ?? null, now()));
    async function report(q = {}, weekly = false) {
        const r = config.report ?? {};
        const days = q.days ?? (q.from ? undefined : (r.days ?? 7));
        const o = await overview({ ...q, days });
        let given = null;
        if (r.sources) {
            try {
                given = await r.sources(o.range);
            }
            catch (e) {
                console.error('[stats-kit] report sources', e);
            }
        }
        const has = (k) => !!given && given[k] !== undefined;
        const withSearch = has('search') ? given.search ?? null : r.search !== false && gsc ? await search({ days: o.range.days }) : null;
        const withYoutube = has('youtube') ? given.youtube ?? null : r.youtube !== false && yt ? await youtube(Math.min(90, o.range.days)) : null;
        let videos = [];
        if (has('youtube') || has('videos'))
            videos = given.videos ?? [];
        else if (yt && withYoutube?.status === 'ok' && withYoutube.totals.views)
            videos = await yt.topVideos(withYoutube.start, withYoutube.end, 3, now()).catch(() => []);
        let blocks = [];
        if (r.blocks) {
            try {
                blocks = await r.blocks(o);
            }
            catch (e) {
                console.error('[stats-kit] report blocks', e);
            }
        }
        let business = null;
        if (r.business) {
            try {
                business = (await r.business(o)) ?? null;
            }
            catch (e) {
                console.error('[stats-kit] report business figures', e);
            }
        }
        // visits and bounces day by day, occurrences of the goals: the charts of these figures
        const daily = umami ? await dailyVisits(umami, o) : null;
        const extra = r.texts ? await r.texts() : null;
        const reportTexts = extra ? createTexts(config.locale ?? 'en', mergeOverrides(config.texts, extra), config.baseTexts) : texts;
        return buildReport({
            overview: o, blocks, business, glance: r.glance, daily, goalSeries: goalSeries(o, config.goals ?? []), search: withSearch, youtube: withYoutube, youtubeVideos: videos, texts: reportTexts, theme: r.theme ?? { brand: '#2f5bd3' },
            siteName: config.siteName, statsUrl: r.statsUrl ?? null, searchUrl: r.searchUrl ?? null, youtubeUrl: r.youtubeUrl ?? null, weekly, world: getWorld(),
        });
    }
    async function sendReport(q = {}, weekly = false) {
        const send = config.report?.send;
        if (!send)
            return { version: 1, ok: false, recipients: 0, error: 'send-not-configured' };
        try {
            const n = await send(await report(q, weekly));
            return { version: 1, ok: true, recipients: typeof n === 'number' ? n : 0, error: null };
        }
        catch (e) {
            return { version: 1, ok: false, recipients: 0, error: errorMessage(e) };
        }
    }
    const worldJson = () => {
        if (worldText !== undefined)
            return worldText;
        const w = config.world;
        try {
            worldText = w === null ? null : w && typeof w === 'object' && 'features' in w ? JSON.stringify(w) : readFileSync(w ?? worldFile(), 'utf8');
        }
        catch {
            worldText = null;
        }
        return worldText;
    };
    const jsonResponse = (status, body, maxAge = 0) => ({
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': maxAge ? `private, max-age=${maxAge}` : 'no-store', 'X-Content-Type-Options': 'nosniff' },
        body: JSON.stringify(body),
    });
    async function handle(req) {
        const path = req.path.replace(/\/+$/, '') || '/';
        const q = req.query;
        const range = { days: q['days'], from: q['from'], to: q['to'] };
        const method = req.method.toUpperCase();
        try {
            if (method === 'GET') {
                switch (path) {
                    case '/':
                    case '/overview': return jsonResponse(200, await overview(range));
                    case '/live': return jsonResponse(200, await live());
                    case '/search': return jsonResponse(200, await search(range));
                    case '/search/indexation': return jsonResponse(200, await indexation());
                    case '/youtube': return jsonResponse(200, await youtube(Number(q['days']) || 28));
                    case '/report/preview': {
                        const m = await report(range);
                        const body = { version: 1, subject: m.subject, html: previewHtml(m), text: m.text };
                        return jsonResponse(200, body);
                    }
                    case '/world.json': {
                        const w = worldJson();
                        return w ? { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=604800' }, body: w } : jsonResponse(404, { error: 'not-found' });
                    }
                }
            }
            if (method === 'POST' && path === '/report/send') {
                const r = await sendReport(range);
                return jsonResponse(r.ok ? 200 : r.error === 'send-not-configured' ? 503 : 502, r);
            }
            return jsonResponse(404, { error: 'not-found' });
        }
        catch (e) {
            console.error('[stats-kit]', e);
            return jsonResponse(500, { error: 'internal-error' });
        }
    }
    const middleware = () => (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const query = {};
        url.searchParams.forEach((v, k) => (query[k] = v));
        handle({ method: req.method ?? 'GET', path: url.pathname, query })
            .then((r) => {
            if (r.status === 404 && next)
                return next(); // unknown route: hand over to the rest of the application
            res.statusCode = r.status;
            for (const [k, v] of Object.entries(r.headers))
                res.setHeader(k, v);
            res.end(r.body);
        })
            .catch((e) => (next ? next(e) : ((res.statusCode = 500), res.end())));
    };
    return { texts, overview, live, search, indexation, youtube, report, sendReport, worldJson, handle, middleware };
}
