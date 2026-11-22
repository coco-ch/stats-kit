import { errorMessage, settle } from "./http.js";
import { parseStats } from "./umami.js";
import { DAY, slotOfLabel, slotsBetween } from "./time.js";
export const labelOf = (labels, key) => !labels ? null : typeof labels === 'function' ? (labels(key) ?? null) : (labels[key] ?? null);
const ZERO = { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 };
const DEFAULT_EXCLUDE = /^\/(admin|api)(\/|$)/;
/** Logical path of an address: without query or trailing slash, without language prefix; `null` if it is ignored. */
export function logicalPath(raw, opts = {}) {
    const path = (raw.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/';
    if ((opts.exclude ?? DEFAULT_EXCLUDE).test(path))
        return null;
    if (!opts.languages?.length)
        return { page: path, lang: null };
    const m = new RegExp(`^/(${opts.languages.map((l) => l.replace(/[^a-z0-9-]/gi, '')).join('|')})(/.*)?$`).exec(path);
    return m ? { page: m[2] || '/', lang: m[1] } : null;
}
const sortItems = (items) => items.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
const add = (m, k, n) => m.set(k, (m.get(k) ?? 0) + n);
/** Simple ranking, with the previous period if it is known. */
export function toItems(points, previous = null, labels, limit = 30) {
    const prev = previous ? new Map() : null;
    for (const p of previous ?? [])
        add(prev, p.x ?? '', p.y);
    const cur = new Map();
    for (const p of points)
        add(cur, p.x ?? '', p.y);
    return sortItems([...cur].map(([key, value]) => ({ key, label: labelOf(labels, key), value, previous: prev ? (prev.get(key) ?? 0) : null }))).slice(0, limit);
}
/** Groups paths by logical page (and by site language). */
export function groupPaths(points, opts = {}) {
    const pages = new Map();
    const langs = new Map();
    for (const { x, y } of points) {
        const l = logicalPath(x ?? '', opts);
        if (!l)
            continue;
        add(pages, l.page, y);
        if (l.lang)
            add(langs, l.lang, y);
    }
    return { pages, langs };
}
const mapItems = (m, prev, labels, limit) => sortItems([...m].map(([key, value]) => ({ key, label: labelOf(labels, key), value, previous: prev ? (prev.get(key) ?? 0) : null }))).slice(0, limit);
/** Groups defined by the site (product pages, articles…), from the logical pages. */
export function pageGroups(pages, prev, groups = []) {
    return groups.map((g) => {
        const cur = new Map();
        const before = prev ? new Map() : null;
        for (const [page, n] of pages) {
            const m = g.pattern.exec(page);
            if (m)
                add(cur, m[1] ?? page, n);
        }
        for (const [page, n] of prev ?? []) {
            const m = g.pattern.exec(page);
            if (m)
                add(before, m[1] ?? page, n);
        }
        return { id: g.id, title: g.title, items: mapItems(cur, before, g.labels, g.limit ?? 15) };
    });
}
/** Detail by logical page: views, visitors, entries, exits, bounces, time, views of the previous period. */
export function pageRows(path, entry, exit, prev, opts = {}, limit = 60) {
    const rows = new Map();
    const row = (k) => {
        let r = rows.get(k);
        if (!r)
            rows.set(k, (r = { key: k, label: labelOf(opts.labels, k), views: 0, visitors: 0, entries: 0, exits: 0, bounces: 0, totaltime: 0, previousViews: 0 }));
        return r;
    };
    for (const e of path) {
        const l = logicalPath(e.name, opts);
        if (l) {
            const r = row(l.page);
            r.views += Number(e.pageviews) || 0;
            r.visitors += e.visitors;
            r.totaltime += e.totaltime;
        }
    }
    for (const e of entry) {
        const l = logicalPath(e.name, opts);
        if (l) {
            const r = row(l.page);
            r.entries += e.visits;
            r.bounces += e.bounces;
        }
    }
    for (const e of exit) {
        const l = logicalPath(e.name, opts);
        if (l)
            row(l.page).exits += e.visits;
    }
    for (const e of prev) {
        const l = logicalPath(e.x, opts);
        const r = l && rows.get(l.page);
        if (r)
            r.previousViews = (r.previousViews ?? 0) + e.y;
    }
    return [...rows.values()].sort((a, b) => b.views - a.views || a.key.localeCompare(b.key)).slice(0, limit);
}
/** Series aligned on continuous slots (zero where the source has nothing). */
export function alignSeries(slots, points, unit, timeZone) {
    const m = new Map();
    for (const p of points ?? [])
        add(m, slotOfLabel(p.x, unit, timeZone), p.y);
    return slots.map((s) => m.get(s) ?? 0);
}
/** Occurrences of each event per slot, aligned on `slots` (zero where the source has nothing). */
export function eventSeries(slots, points, unit, timeZone) {
    const at = new Map(slots.map((s, i) => [s, i]));
    const out = {};
    for (const p of points) {
        if (typeof p?.x !== 'string' || typeof p.t !== 'string')
            continue;
        const i = at.get(slotOfLabel(p.t, unit, timeZone));
        if (i === undefined)
            continue;
        (out[p.x] ??= slots.map(() => 0))[i] += Number(p.y) || 0;
    }
    return out;
}
/** Page views by weekday (Monday = 0) and hour, from hourly slots. */
export function heatmap(points, timeZone) {
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const p of points ?? []) {
        const slot = slotOfLabel(p.x, 'hour', timeZone);
        const day = (new Date(Date.UTC(+slot.slice(0, 4), +slot.slice(5, 7) - 1, +slot.slice(8, 10))).getUTCDay() + 6) % 7;
        const hour = +slot.slice(11, 13);
        if (Number.isInteger(day) && hour >= 0 && hour < 24)
            grid[day][hour] += p.y;
    }
    return grid;
}
const session = (s) => ({
    country: s.country || null, city: s.city || null, device: s.device || null, browser: s.browser || null, os: s.os || null,
    views: Number(s.views ?? 0), lastAt: s.lastAt ?? s.createdAt ?? null,
});
const emptyBreakdowns = () => ({
    pages: [], entries: [], exits: [], referrers: [], channels: [], countries: [], regions: [], cities: [], languages: [], siteLanguages: [],
    devices: [], browsers: [], os: [], screens: [], events: [], hostnames: [], utmSources: [], utmMediums: [], utmCampaigns: [],
});
const emptySeries = (slots, unit) => ({ unit, slots, pageviews: slots.map(() => 0), visitors: slots.map(() => 0), previousPageviews: null });
/** Empty response (Umami not configured or in error): same shape, figures at zero. */
export function emptyOverview(range, status, error, now = Date.now()) {
    const from = Date.parse(range.from), to = Date.parse(range.to);
    return {
        version: 1, status, error, generatedAt: new Date(now).toISOString(), range, totals: { ...ZERO }, previous: null, active: null,
        series: emptySeries(slotsBetween(from, to, range.unit, range.timeZone), range.unit),
        last24h: emptySeries(slotsBetween(now - DAY, now, 'hour', range.timeZone), 'hour'),
        heatmap: heatmap([], range.timeZone), breakdowns: emptyBreakdowns(), pages: [], groups: [], goals: [], counts: { countries: null, events: null },
        sessions: [], extras: null, eventSeries: null, dashboardUrl: null,
    };
}
/** Site extras, never making the response fail. */
export async function siteExtras(opts, range) {
    if (!opts.extras)
        return null;
    try {
        return await opts.extras(range);
    }
    catch (e) {
        console.error('[stats-kit] site data unavailable:', errorMessage(e));
        return null;
    }
}
/** Overview of a period. Without `umami`: "not configured" response (with the site data). */
export async function buildOverview(umami, range, opts, now = Date.now()) {
    const extrasP = siteExtras(opts, range);
    if (!umami)
        return { ...emptyOverview(range, 'not-configured', null, now), extras: await extrasP };
    const tz = range.timeZone;
    const from = Date.parse(range.from), to = Date.parse(range.to);
    const pFrom = Date.parse(range.previousFrom), pTo = Date.parse(range.previousTo);
    const unit = range.unit;
    const limit = opts.limit ?? 30;
    const q = { startAt: from, endAt: to };
    const pq = { startAt: pFrom, endAt: pTo };
    const none = [];
    const m = (type, n = limit, a = from, b = to) => settle(umami.metric(type, a, b, n), none);
    const pv = (a, b, u) => settle(umami.get('pageviews', { startAt: a, endAt: b, unit: u, timezone: tz }), {});
    const expanded = (type) => settle(umami.get('metrics/expanded', { ...q, type, limit: 500 }), []);
    let stats;
    try {
        stats = await umami.get('stats', q);
    }
    catch (e) {
        return { ...emptyOverview(range, 'error', errorMessage(e), now), extras: await extrasP };
    }
    const [prevStats, active, series, prevSeries, last24, hourly, paths, prevPaths, entries, exits, referrers, prevReferrers, channels, prevChannels, countries, prevCountries, regions, cities, languages, devices, browsers, os, screens, events, prevEvents, hostnames, utmS, utmM, utmC, pathX, entryX, exitX, sessions, sessionStats, evSeries] = await Promise.all([
        settle(umami.get('stats', pq), null),
        settle(umami.get('active').then((a) => a.visitors ?? a.x ?? 0), null),
        pv(from, to, unit), pv(pFrom, pTo, unit), pv(now - DAY, now, 'hour'), unit === 'hour' ? Promise.resolve(null) : pv(from, to, 'hour'),
        m('path', 500), m('path', 500, pFrom, pTo), m('entry', 500), m('exit', 500), m('referrer'), m('referrer', limit, pFrom, pTo),
        m('channel'), m('channel', limit, pFrom, pTo), m('country'), m('country', limit, pFrom, pTo), m('region'), m('city'), m('language', 15),
        m('device'), m('browser', 12), m('os', 12), m('screen', 12), m('event', 50), m('event', 50, pFrom, pTo), m('hostname'),
        m('utmSource'), m('utmMedium'), m('utmCampaign'),
        expanded('path'), expanded('entry'), expanded('exit'),
        settle(umami.get('sessions', { ...q, pageSize: 12, page: 1 }), {}),
        settle(umami.get('sessions/stats', q), {}),
        settle(umami.get('events/series', { ...q, unit, timezone: tz }), null),
    ]);
    const pages = opts.pages ?? {};
    const cur = groupPaths(paths, pages);
    const before = groupPaths(prevPaths, pages);
    const slots = slotsBetween(from, to, unit, tz);
    const prevSlots = slotsBetween(pFrom, pTo, unit, tz);
    const prevValues = alignSeries(prevSlots, prevSeries.pageviews, unit, tz);
    const s24 = slotsBetween(now - DAY, now, 'hour', tz);
    const eventLabels = opts.events?.labels;
    const goalSum = (pts, names) => pts.filter((p) => names.includes(p.x)).reduce((n, p) => n + p.y, 0);
    const goals = (opts.goals ?? []).map((g) => ({ id: g.id, label: g.label, value: goalSum(events, g.events), previous: goalSum(prevEvents, g.events) }));
    const prevStatsParsed = prevStats ? parseStats(prevStats) : null;
    return {
        version: 1,
        status: 'ok',
        error: null,
        generatedAt: new Date(now).toISOString(),
        range,
        totals: parseStats(stats),
        previous: prevStatsParsed,
        active,
        series: {
            unit, slots,
            pageviews: alignSeries(slots, series.pageviews, unit, tz),
            visitors: alignSeries(slots, series.sessions, unit, tz),
            previousPageviews: prevSeries.pageviews ? slots.map((_, i) => prevValues[i] ?? 0) : null,
        },
        last24h: { unit: 'hour', slots: s24, pageviews: alignSeries(s24, last24.pageviews, 'hour', tz), visitors: alignSeries(s24, last24.sessions, 'hour', tz), previousPageviews: null },
        heatmap: heatmap((hourly ?? series).pageviews, tz),
        breakdowns: {
            pages: mapItems(cur.pages, before.pages, pages.labels, limit),
            entries: mapItems(groupPaths(entries, pages).pages, null, pages.labels, limit),
            exits: mapItems(groupPaths(exits, pages).pages, null, pages.labels, limit),
            referrers: toItems(referrers, prevReferrers, undefined, limit),
            channels: toItems(channels, prevChannels, undefined, limit),
            countries: toItems(countries, prevCountries, undefined, limit),
            regions: toItems(regions, null, undefined, limit),
            cities: toItems(cities, null, undefined, limit),
            languages: toItems(languages, null, undefined, limit),
            siteLanguages: mapItems(cur.langs, before.langs, undefined, limit),
            devices: toItems(devices, null, undefined, limit),
            browsers: toItems(browsers, null, undefined, limit),
            os: toItems(os, null, undefined, limit),
            screens: toItems(screens, null, undefined, limit),
            events: toItems(events, prevEvents, eventLabels, 50),
            hostnames: toItems(hostnames, null, undefined, limit),
            utmSources: toItems(utmS, null, undefined, limit),
            utmMediums: toItems(utmM, null, undefined, limit),
            utmCampaigns: toItems(utmC, null, undefined, limit),
        },
        pages: pageRows(pathX, entryX, exitX, prevPaths, pages),
        groups: pageGroups(cur.pages, before.pages, pages.groups),
        goals,
        counts: { countries: sessionStats['countries']?.value ?? null, events: sessionStats['events']?.value ?? null },
        sessions: (sessions.data ?? []).map(session),
        extras: await extrasP,
        eventSeries: Array.isArray(evSeries) ? eventSeries(slots, evSeries, unit, tz) : null,
        dashboardUrl: opts.dashboardUrl ?? null,
    };
}
/** Visits through a tracked link `utm_source=<source>` and visits from a domain containing the source (Umami 3). */
export async function sourceVisits(umami, startAt, endAt, source, pages = {}) {
    const tagged = { startAt, endAt, query: `c.utm_source=${source}` };
    const [stats, paths, referred] = await Promise.all([
        umami.get('stats', tagged),
        settle(umami.get('metrics', { ...tagged, type: 'path', limit: 100 }), []),
        settle(umami.get('stats', { startAt, endAt, referrer: `c.${source}` }), null),
    ]);
    const s = parseStats(stats);
    return { visitors: s.visitors, visits: s.visits, landing: mapItems(groupPaths(paths, pages).pages, null, pages.labels, 20), referred: referred ? parseStats(referred).visits : null };
}
