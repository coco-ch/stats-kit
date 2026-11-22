import type { Range, Unit } from 'stats-kit/contract';
export declare const HOUR = 3600000;
export declare const DAY = 86400000;
/** Wall-clock time of an instant in a time zone. */
export declare function zonedParts(ms: number, timeZone: string): {
    y: number;
    m: number;
    d: number;
    h: number;
    mi: number;
    s: number;
};
/** Offset of the time zone at this instant, in milliseconds (wall clock − UTC). */
export declare function offsetAt(ms: number, timeZone: string): number;
/** Instant of a wall-clock time in a time zone (daylight saving time included). */
export declare function zonedToInstant(y: number, m: number, d: number, h: number, timeZone: string): number;
/** Slot of an instant: "YYYY-MM-DD" (day) or "YYYY-MM-DDTHH" (hour), in the time zone. */
export declare function slotOf(ms: number, unit: Unit, timeZone: string): string;
/** All the slots of [from, to[, in order, without gaps. */
export declare function slotsBetween(from: number, to: number, unit: Unit, timeZone: string): string[];
/**
 * Slot of a date returned by a source: an instant ("…Z", "…+01:00") is converted to the time zone; a wall-clock time
 * ("2026-11-16 14:00:00", already in the time zone asked from the source) is read as is.
 */
export declare function slotOfLabel(x: string, unit: Unit, timeZone: string): string;
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
export declare function resolveRange(q: RangeQuery, timeZone: string, now?: number, defaultDays?: number): Range;
/** Day "YYYY-MM-DD" (UTC) of an instant. */
export declare const ymd: (ms: number) => string;
/** ISO week id ("2026-W47") of an instant, computed on the date in the time zone. */
export declare function weekId(ms: number, timeZone: string): string;
