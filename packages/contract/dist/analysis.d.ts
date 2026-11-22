import type { QueryPage, SearchRow, YoutubeDay, YoutubeTotals } from './types.ts';
/** Text without accents or capitals, to compare queries. */
export declare const normalize: (s: string) => string;
/** Brand query: it contains one of the words of the site name. */
export declare function isBrand(query: string, terms: string[]): boolean;
/** Average click-through rate observed at position 3, basis of the estimate of clicks to win. */
export declare const CTR_AT_3 = 0.11;
export interface Potential extends SearchRow {
    /** Estimated extra clicks if the query moved up to position 3. */
    gain: number;
}
/** Queries visible at position 4 to 20, ranked by clicks to win. */
export declare function potential(queries: SearchRow[], minImpressions?: number): Potential[];
export interface Mover extends SearchRow {
    before: number;
    diff: number;
}
/** Queries whose impressions rise (`up`) or fall (`down`) compared with the previous period. */
export declare function movers(queries: SearchRow[], previous: SearchRow[], dir: 'up' | 'down'): Mover[];
/** Queries absent from the previous period. */
export declare function newQueries(queries: SearchRow[], previous: SearchRow[]): SearchRow[];
/** Pages often shown but rarely clicked. */
export declare const lowCtrPages: (pages: SearchRow[], minImpressions?: number, maxCtr?: number) => SearchRow[];
export interface LostPage extends SearchRow {
    before: number;
}
/** Pages that had clicks in the previous period and have none now. */
export declare function lostPages(pages: SearchRow[], previous: SearchRow[]): LostPage[];
export interface Cannibal {
    key: string;
    pages: number;
    impressions: number;
    clicks: number;
    urls: string[];
}
/** Queries for which several pages of the site are shown. */
export declare function cannibalization(rows: QueryPage[]): Cannibal[];
/** Values of the previous period, by key. */
export declare const byKey: <T extends {
    key: string;
}>(rows: T[]) => Map<string, T>;
/** Path of an address ("https://example.org/fr/contact" → "/fr/contact"), the address itself if it cannot be read. */
export declare function pathOf(url: string): string;
/** Sum of YouTube days; average view duration = minutes divided by views. */
export declare function sumDays(days: YoutubeDay[]): YoutubeTotals;
/** The last `days` days of a series and the `days` before. */
export declare function lastDays(series: YoutubeDay[], days: number): {
    start: string;
    end: string;
    totals: YoutubeTotals;
    previous: YoutubeTotals;
    current: YoutubeDay[];
    before: YoutubeDay[];
};
