import { settle } from "../http.js";
import { zonedToInstant } from "../time.js";
import { parseStats } from "../umami.js";
/** Visits and bounces of each day of the period; `null` if the period is not counted by day, too long, or if Umami refuses one day. */
export async function dailyVisits(umami, o) {
    const s = o.series;
    if (o.status !== 'ok' || s.unit !== 'day' || s.slots.length < 2 || s.slots.length > 31)
        return null;
    const tz = o.range.timeZone;
    const from = Date.parse(o.range.from), to = Date.parse(o.range.to);
    const starts = s.slots.map((d) => zonedToInstant(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10), 0, tz));
    const days = await Promise.all(starts.map((start, i) => settle(umami.get('stats', { startAt: Math.max(from, start), endAt: i + 1 < starts.length ? starts[i + 1] : to }), null)));
    if (days.some((d) => d === null))
        return null;
    const parsed = days.map((d) => parseStats(d));
    return { visits: parsed.map((d) => d.visits), bounces: parsed.map((d) => d.bounces) };
}
/** Occurrences of each goal per slot (sum of its events), from `overview.eventSeries`; a goal without data is left out. */
export function goalSeries(o, goals) {
    const ev = o.eventSeries;
    const out = {};
    if (!ev)
        return out;
    for (const g of goals) {
        const lines = g.events.map((e) => ev[e]).filter((x) => Array.isArray(x));
        if (lines.length)
            out[g.id] = o.series.slots.map((_, i) => lines.reduce((n, l) => n + (l[i] ?? 0), 0));
    }
    return out;
}
