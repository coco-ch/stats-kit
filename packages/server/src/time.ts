/*
 * Dates and time zones without dependency (Intl): periods, series slots, conversion of a wall-clock time into an instant.
 */
import type { Range, Unit } from 'stats-kit/contract';

export const HOUR = 3_600_000;
export const DAY = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();
const formatter = (timeZone: string) => {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    formatters.set(timeZone, f);
  }
  return f;
};

/** Wall-clock time of an instant in a time zone. */
export function zonedParts(ms: number, timeZone: string): { y: number; m: number; d: number; h: number; mi: number; s: number } {
  const p: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(new Date(ms))) if (part.type !== 'literal') p[part.type] = Number(part.value);
  return { y: p['year'], m: p['month'], d: p['day'], h: p['hour'] % 24, mi: p['minute'], s: p['second'] };
}

/** Offset of the time zone at this instant, in milliseconds (wall clock − UTC). */
export function offsetAt(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

/** Instant of a wall-clock time in a time zone (daylight saving time included). */
export function zonedToInstant(y: number, m: number, d: number, h: number, timeZone: string): number {
  const wall = Date.UTC(y, m - 1, d, h);
  const first = wall - offsetAt(wall, timeZone);
  return wall - offsetAt(first, timeZone);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Slot of an instant: "YYYY-MM-DD" (day) or "YYYY-MM-DDTHH" (hour), in the time zone. */
export function slotOf(ms: number, unit: Unit, timeZone: string): string {
  const p = zonedParts(ms, timeZone);
  const day = `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  return unit === 'day' ? day : `${day}T${pad(p.h)}`;
}

/** All the slots of [from, to[, in order, without gaps. */
export function slotsBetween(from: number, to: number, unit: Unit, timeZone: string): string[] {
  const out: string[] = [];
  const start = Math.floor(from / HOUR) * HOUR;
  for (let t = start; t < to; t += HOUR) {
    const key = slotOf(t, unit, timeZone);
    if (out.at(-1) !== key) out.push(key);
  }
  return out;
}

/**
 * Slot of a date returned by a source: an instant ("…Z", "…+01:00") is converted to the time zone; a wall-clock time
 * ("2026-11-16 14:00:00", already in the time zone asked from the source) is read as is.
 */
export function slotOfLabel(x: string, unit: Unit, timeZone: string): string {
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(x)) {
    const t = Date.parse(x);
    if (Number.isFinite(t)) return slotOf(t, unit, timeZone);
  }
  const day = x.slice(0, 10);
  return unit === 'day' ? day : `${day}T${x.slice(11, 13) || '00'}`;
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Period parameters received in the address. */
export interface RangeQuery {
  days?: unknown;
  from?: unknown;
  to?: unknown;
}

/**
 * Requested period: `days` (1 = last 24 hours, 7, 30, 90… up to 366; 30 by default) or `from` / `to` (YYYY-MM-DD, days
 * included, read in the time zone, at most 366 days). The previous period has the same length and ends where the period starts.
 */
export function resolveRange(q: RangeQuery, timeZone: string, now = Date.now(), defaultDays = 30): Range {
  let from: number | null = null;
  let to = now;
  const f = typeof q.from === 'string' ? YMD.exec(q.from) : null;
  if (f) {
    const t = typeof q.to === 'string' ? YMD.exec(q.to) : null;
    const start = zonedToInstant(+f[1], +f[2], +f[3], 0, timeZone);
    const endDay = t ? Date.UTC(+t[1], +t[2] - 1, +t[3]) + DAY : null;
    const end = endDay === null ? now : Math.min(now, zonedToInstant(new Date(endDay).getUTCFullYear(), new Date(endDay).getUTCMonth() + 1, new Date(endDay).getUTCDate(), 0, timeZone));
    if (end > start && end - start <= 366 * DAY) {
      from = start;
      to = end;
    }
  }
  if (from === null) {
    const asked = Math.floor(Number(q.days));
    const days = Number.isFinite(asked) && asked >= 1 ? Math.min(asked, 366) : defaultDays;
    from = now - days * DAY;
    to = now;
  }
  const days = Math.max(1, Math.round((to - from) / DAY));
  const iso = (ms: number) => new Date(ms).toISOString();
  return { from: iso(from), to: iso(to), days, unit: to - from <= DAY ? 'hour' : 'day', timeZone, previousFrom: iso(from - (to - from)), previousTo: iso(from) };
}

/** Day "YYYY-MM-DD" (UTC) of an instant. */
export const ymd = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** ISO week id ("2026-W47") of an instant, computed on the date in the time zone. */
export function weekId(ms: number, timeZone: string): string {
  const { y, m, d } = zonedParts(ms, timeZone);
  const t = new Date(Date.UTC(y, m - 1, d));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const week = Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(week)}`;
}
