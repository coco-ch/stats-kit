/*
 * Figures of the report day by day that the overview does not carry: visits and bounces (one Umami `stats` call per day of
 * the period, for periods of 2 to 31 days counted by day), and the occurrences of each goal (from the events per slot).
 * They draw the small charts of the "Visits", "Bounce" and goal figures.
 */
import type { StatsOverview } from 'stats-kit/contract';
import { settle } from '../http.ts';
import { zonedToInstant } from '../time.ts';
import { parseStats, type UmamiClient } from '../umami.ts';

/** Day by day, aligned on `overview.series.slots`. */
export interface ReportDaily {
  visits: number[];
  bounces: number[];
}

/** Visits and bounces of each day of the period; `null` if the period is not counted by day, too long, or if Umami refuses one day. */
export async function dailyVisits(umami: UmamiClient, o: StatsOverview): Promise<ReportDaily | null> {
  const s = o.series;
  if (o.status !== 'ok' || s.unit !== 'day' || s.slots.length < 2 || s.slots.length > 31) return null;
  const tz = o.range.timeZone;
  const from = Date.parse(o.range.from), to = Date.parse(o.range.to);
  const starts = s.slots.map((d) => zonedToInstant(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10), 0, tz));
  const days = await Promise.all(starts.map((start, i) =>
    settle(umami.get<Record<string, unknown>>('stats', { startAt: Math.max(from, start), endAt: i + 1 < starts.length ? starts[i + 1] : to }), null)));
  if (days.some((d) => d === null)) return null;
  const parsed = days.map((d) => parseStats(d));
  return { visits: parsed.map((d) => d.visits), bounces: parsed.map((d) => d.bounces) };
}

/** Occurrences of each goal per slot (sum of its events), from `overview.eventSeries`; a goal without data is left out. */
export function goalSeries(o: StatsOverview, goals: { id: string; events: string[] }[]): Record<string, number[]> {
  const ev = o.eventSeries;
  const out: Record<string, number[]> = {};
  if (!ev) return out;
  for (const g of goals) {
    const lines = g.events.map((e) => ev[e]).filter((x): x is number[] => Array.isArray(x));
    if (lines.length) out[g.id] = o.series.slots.map((_, i) => lines.reduce((n, l) => n + (l[i] ?? 0), 0));
  }
  return out;
}
