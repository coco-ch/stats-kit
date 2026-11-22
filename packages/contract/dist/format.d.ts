import { type Texts } from './texts.ts';
/** Displayable change: text ("▲ +12 %") and direction (`up` = good news, `down` = bad news). */
export interface Delta {
    text: string;
    tone: 'up' | 'down' | 'flat' | '';
}
/** Rate (0 to 1) as a percentage in the locale ("12.5%", "12,5 %"); `signed` adds "+" to a positive value. */
export declare const formatPercent: (texts: Texts, v: number, digits?: number, signed?: boolean) => string;
/** Relative change; `lowerIsBetter` for a position (a smaller figure is better). */
export declare function delta(texts: Texts, now: number, before: number | null | undefined, lowerIsBetter?: boolean): Delta;
/** Unit of an absolute change: percentage points, seconds, or none. */
export type GapUnit = 'points' | 'seconds' | null;
/** Absolute change (positions, percentage points, seconds). */
export declare function gap(texts: Texts, now: number, before: number | null | undefined, lowerIsBetter: boolean, digits?: number, unit?: GapUnit): Delta;
/** Change as a whole percentage, or `null` without a basis for comparison (report). */
export declare const percentChange: (now: number, before: number | null | undefined) => number | null;
/** Duration in seconds, in the locale: "2 min 5 s", "42 sec", "—" if zero. */
export declare function formatDuration(texts: Texts, sec: number): string;
/** Compact line (SVG path in a w × h box); empty with fewer than two points or no variation. */
export declare function sparkPath(values: number[], w?: number, h?: number): string;
/** Round grid step (1, 2 or 5 × 10ⁿ) for at most `parts` intervals. */
export declare function niceStep(max: number, parts?: number): number;
/** Slot "YYYY-MM-DD" or "YYYY-MM-DDTHH" → UTC date carrying these figures (to display it without a time zone shift). */
export declare function slotDate(slot: string): Date;
/** Weekday of a slot, Monday = 0. */
export declare const weekdayOf: (slot: string) => number;
/** Name of a weekday (Monday = 0) in the locale: "Monday" / "Mon". */
export declare const weekdayName: (texts: Texts, day: number, width?: "long" | "short") => string;
/** Hour of the day (0 to 23) in the locale: "09:00", "9 AM"… */
export declare const hourName: (texts: Texts, hour: number) => string;
/** Label of a slot: hour ("14:00"), short day ("16 Nov") or long day ("Mon 16 Nov"). */
export declare function slotLabel(texts: Texts, slot: string, unit: 'day' | 'hour', long?: boolean): string;
/** Day "YYYY-MM-DD" in full: "Monday 16 November". */
export declare const longDay: (texts: Texts, ymd: string) => string;
/** Day "YYYY-MM-DD" or ISO instant, short: "16 Nov 2026"; the instant is read in `timeZone`. */
export declare function shortDate(texts: Texts, value: string, timeZone?: string, withYear?: boolean): string;
/** Instant with date and time, short, read in `timeZone`. */
export declare const shortDateTime: (texts: Texts, iso: string, timeZone?: string) => string;
/** Busiest slot of a 7 × 24 heatmap, or `null` if it is empty. */
export declare function bestSlot(grid: number[][] | null | undefined): {
    day: number;
    hour: number;
    value: number;
} | null;
/** Name of a country (ISO alpha-2 or alpha-3 code) in the language of the texts, falling back to the code. */
export declare function countryName(texts: Texts, code: string): string;
/** Name of a language ("fr" → "French"), falling back to the code. */
export declare const languageName: (texts: Texts, code: string) => string;
/** Region "FR-PAC" → "PAC (France)". */
export declare function regionName(texts: Texts, code: string): string;
/** Flag (emoji) of an alpha-2 country code; a globe otherwise. */
export declare const flag: (code: string | null | undefined) => string;
/** Initial capital (browsers and systems arrive in lower case). */
export declare const capitalize: (s: string) => string;
/** Label of an Umami device. */
export declare const deviceName: (texts: Texts, code: string) => string;
/** Name of a browser as Umami codes it ("edge-chromium" → "Edge"). */
export declare const browserName: (code: string) => string;
/** Label of an Umami acquisition channel. */
export declare const channelName: (texts: Texts, code: string) => string;
/** Text of the period: "1 Nov to 30 Nov (30 days)" or "last 24 hours". */
export declare function rangeText(texts: Texts, range: {
    from: string;
    to: string;
    days: number;
    timeZone: string;
}): string;
/** CSV separator of the locale: ";" where the decimal separator is a comma (what Excel expects there), "," otherwise. */
export declare const csvSeparator: (texts: Texts) => string;
/** CSV (quotes, BOM for Excel). */
export declare function toCsv(rows: (string | number | null | undefined)[][], separator?: string): string;
/** Safe file name from a title. */
export declare const fileName: (title: string) => string;
