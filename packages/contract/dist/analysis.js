/** Text without accents or capitals, to compare queries. */
export const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Brand query: it contains one of the words of the site name. */
export function isBrand(query, terms) {
    const q = normalize(query);
    return terms.some((t) => t.trim() && q.includes(normalize(t.trim())));
}
/** Average click-through rate observed at position 3, basis of the estimate of clicks to win. */
export const CTR_AT_3 = 0.11;
/** Queries visible at position 4 to 20, ranked by clicks to win. */
export function potential(queries, minImpressions = 10) {
    return queries
        .filter((q) => q.position >= 4 && q.position <= 20 && q.impressions >= minImpressions)
        .map((q) => ({ ...q, gain: Math.max(0, Math.round(q.impressions * (CTR_AT_3 - q.ctr))) }))
        .filter((q) => q.gain > 0)
        .sort((a, b) => b.gain - a.gain);
}
/** Queries whose impressions rise (`up`) or fall (`down`) compared with the previous period. */
export function movers(queries, previous, dir) {
    const before = new Map(previous.map((p) => [p.key, p.impressions]));
    const now = new Map(queries.map((q) => [q.key, q]));
    const keys = new Set([...now.keys(), ...(dir === 'down' ? before.keys() : [])]);
    const out = [];
    for (const k of keys) {
        const b = before.get(k);
        if (b === undefined)
            continue; // new query: listed separately
        const q = now.get(k) ?? { key: k, clicks: 0, impressions: 0, ctr: 0, position: 0 };
        const diff = q.impressions - b;
        if ((dir === 'up' && diff > 0) || (dir === 'down' && diff < 0))
            out.push({ ...q, before: b, diff });
    }
    return out.sort((a, b) => (dir === 'up' ? b.diff - a.diff : a.diff - b.diff));
}
/** Queries absent from the previous period. */
export function newQueries(queries, previous) {
    const before = new Set(previous.map((p) => p.key));
    return queries.filter((q) => !before.has(q.key) && q.impressions > 0).sort((a, b) => b.impressions - a.impressions);
}
/** Pages often shown but rarely clicked. */
export const lowCtrPages = (pages, minImpressions = 20, maxCtr = 0.02) => pages.filter((p) => p.impressions >= minImpressions && p.ctr < maxCtr).sort((a, b) => b.impressions - a.impressions);
/** Pages that had clicks in the previous period and have none now. */
export function lostPages(pages, previous) {
    const now = new Map(pages.map((p) => [p.key, p]));
    return previous
        .filter((p) => p.clicks > 0 && !(now.get(p.key)?.clicks ?? 0))
        .map((p) => ({ ...(now.get(p.key) ?? { key: p.key, clicks: 0, impressions: 0, ctr: 0, position: 0 }), before: p.clicks }))
        .sort((a, b) => b.before - a.before);
}
/** Queries for which several pages of the site are shown. */
export function cannibalization(rows) {
    const by = new Map();
    for (const r of rows)
        if (r.impressions > 0)
            by.set(r.query, [...(by.get(r.query) ?? []), r]);
    return [...by]
        .filter(([, list]) => list.length > 1)
        .map(([key, list]) => ({
        key,
        pages: list.length,
        impressions: list.reduce((n, r) => n + r.impressions, 0),
        clicks: list.reduce((n, r) => n + r.clicks, 0),
        urls: list.map((r) => r.page),
    }))
        .sort((a, b) => b.impressions - a.impressions);
}
/** Values of the previous period, by key. */
export const byKey = (rows) => new Map(rows.map((r) => [r.key, r]));
/** Path of an address ("https://example.org/fr/contact" → "/fr/contact"), the address itself if it cannot be read. */
export function pathOf(url) {
    try {
        const u = new URL(url);
        return u.pathname + u.search;
    }
    catch {
        return url;
    }
}
/** Sum of YouTube days; average view duration = minutes divided by views. */
export function sumDays(days) {
    const t = days.reduce((a, d) => ({ views: a.views + d.views, minutes: a.minutes + d.minutes, gained: a.gained + d.gained, lost: a.lost + d.lost }), { views: 0, minutes: 0, gained: 0, lost: 0 });
    return { ...t, averageViewDuration: t.views ? Math.round((t.minutes * 60) / t.views) : 0 };
}
/** The last `days` days of a series and the `days` before. */
export function lastDays(series, days) {
    const current = series.slice(-days);
    const before = series.slice(-2 * days, -days);
    return { start: current[0]?.date ?? '', end: current.at(-1)?.date ?? '', totals: sumDays(current), previous: sumDays(before), current, before };
}
