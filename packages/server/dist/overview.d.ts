import type { Extras, Item, ItemGroup, PageRow, Range, StatsOverview, Unit } from 'stats-kit/contract';
import { type Expanded, type Point, type UmamiClient } from './umami.ts';
/** Labels given by the site: table, or function (`null` = no label, the key is shown). */
export type Labels = Record<string, string> | ((key: string) => string | null | undefined);
export declare const labelOf: (labels: Labels | undefined, key: string) => string | null;
/** Settings of the site pages. */
export interface PagesOptions {
    /** Language prefixes ("fr", "en"): /fr/contact and /en/contact count as /contact; paths without a prefix are ignored. */
    languages?: string[];
    /** Paths to ignore (administration, API…). Default: /admin and /api. */
    exclude?: RegExp;
    /** Page labels, by logical path ("/contact" → "Contact"). */
    labels?: Labels;
    /** Groups: the first parenthesis of the pattern (applied to the logical path) gives the key. */
    groups?: {
        id: string;
        title: string;
        pattern: RegExp;
        labels?: Labels;
        limit?: number;
    }[];
}
export interface OverviewOptions {
    timeZone: string;
    pages?: PagesOptions;
    /** Labels of the tracked events. */
    events?: {
        labels?: Labels;
    };
    /** Goals: total of one or more events. */
    goals?: {
        id: string;
        label: string;
        events: string[];
    }[];
    /** Site's own data (its database), added to the response; shown even without Umami. */
    extras?: (range: Range) => Promise<Extras | null>;
    /** Umami dashboard. */
    dashboardUrl?: string | null;
    /** Number of rows kept per ranking (30 by default). */
    limit?: number;
}
/** Logical path of an address: without query or trailing slash, without language prefix; `null` if it is ignored. */
export declare function logicalPath(raw: string, opts?: PagesOptions): {
    page: string;
    lang: string | null;
} | null;
/** Simple ranking, with the previous period if it is known. */
export declare function toItems(points: Point[], previous?: Point[] | null, labels?: Labels, limit?: number): Item[];
/** Groups paths by logical page (and by site language). */
export declare function groupPaths(points: Point[], opts?: PagesOptions): {
    pages: Map<string, number>;
    langs: Map<string, number>;
};
/** Groups defined by the site (product pages, articles…), from the logical pages. */
export declare function pageGroups(pages: Map<string, number>, prev: Map<string, number> | null, groups?: PagesOptions['groups']): ItemGroup[];
/** Detail by logical page: views, visitors, entries, exits, bounces, time, views of the previous period. */
export declare function pageRows(path: Expanded[], entry: Expanded[], exit: Expanded[], prev: Point[], opts?: PagesOptions, limit?: number): PageRow[];
/** Series aligned on continuous slots (zero where the source has nothing). */
export declare function alignSeries(slots: string[], points: Point[] | undefined, unit: Unit, timeZone: string): number[];
/** Page views by weekday (Monday = 0) and hour, from hourly slots. */
export declare function heatmap(points: Point[] | undefined, timeZone: string): number[][];
/** Empty response (Umami not configured or in error): same shape, figures at zero. */
export declare function emptyOverview(range: Range, status: 'not-configured' | 'error', error: string | null, now?: number): StatsOverview;
/** Overview of a period. Without `umami`: "not configured" response (with the site data). */
export declare function buildOverview(umami: UmamiClient | null, range: Range, opts: OverviewOptions, now?: number): Promise<StatsOverview>;
/** Visits through a tracked link `utm_source=<source>` and visits from a domain containing the source (Umami 3). */
export declare function sourceVisits(umami: UmamiClient, startAt: number, endAt: number, source: string, pages?: PagesOptions): Promise<{
    visitors: number;
    visits: number;
    landing: Item[];
    referred: number | null;
}>;
