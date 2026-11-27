import type { Item, YoutubeOverview, YoutubeSite } from 'stats-kit/contract';
import { type Fetch } from './http.ts';
export interface YoutubeConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    /** Expected channel: another channel (wrong token) is refused. */
    channelId?: string;
    /** Public address of the channel (shown even without settings). */
    channelUrl?: string;
    /** `utm_source` value of the links published on the channel ("youtube"). */
    utmSource?: string;
    /** Label of a video given by the site (film name…). */
    videoLabel?: (video: {
        id: string;
        title: string;
    }) => string | null | undefined;
    /** Videos to follow in addition to the uploads playlist (older unlisted versions…). */
    extraVideoIds?: () => string[] | Promise<string[]>;
    tokenUrl?: string;
    apiUrl?: string;
    analyticsUrl?: string;
}
export declare const youtubeConfigured: (c: YoutubeConfig | null | undefined) => c is YoutubeConfig;
/** YouTube ISO 8601 duration ("PT1M20S") in seconds. */
export declare function isoSeconds(iso: string | undefined): number;
interface Table {
    columnHeaders?: {
        name: string;
    }[];
    rows?: unknown[][];
}
/** YouTube Analytics response as named rows. */
export declare const tableRows: (t: Table) => Record<string, string | number>[];
/** What the site counts on its side (visits from YouTube, requests): provided by the kit. */
export interface SiteCounter {
    visits?: (from: number, to: number, source: string) => Promise<{
        visits: number;
        visitors: number;
        referred: number | null;
        landing: Item[];
    }>;
    requests?: (from: number, to: number, source: string) => Promise<{
        total: number;
        bySubject: Item[];
    }>;
}
export interface YoutubeClient {
    overview(days: number, site?: SiteCounter, now?: number): Promise<YoutubeOverview>;
    /** Most viewed video over a period (report). */
    topVideo(start: string, end: string): Promise<{
        title: string;
        url: string;
        views: number;
    } | null>;
    /** Most viewed videos over a period, most viewed first (report). */
    topVideos(start: string, end: string, count?: number, now?: number): Promise<{
        title: string;
        url: string;
        views: number;
    }[]>;
    reset(): void;
}
/** Response of the same shape without a channel (not configured or error). */
export declare function emptyYoutube(status: 'not-configured' | 'error', error: string | null, days: number, channelUrl: string | null, now?: number): YoutubeOverview;
/** Visits and requests from YouTube over the period and the previous one; `null` if the site counts nothing. */
export declare function siteSide(site: SiteCounter | undefined, source: string, days: number, now: number): Promise<YoutubeSite | null>;
export declare function youtubeClient(config: YoutubeConfig, fetchFn?: Fetch): YoutubeClient;
export {};
