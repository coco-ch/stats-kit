import { type Fetch } from './http.ts';
export interface UmamiConfig {
    /** Umami address ("https://umami.example.org"); the API is under /api. For Umami Cloud: "https://api.umami.is/v1" with `apiKey`. */
    url: string;
    /** Website id in Umami. */
    websiteId: string;
    /** Service account (read-only) of a self-hosted Umami. */
    username?: string;
    password?: string;
    /** API key (Umami Cloud): replaces the service account. */
    apiKey?: string;
    /** Dashboard opened by the "Open Umami" button; `false` to hide it. Default: {url}/websites/{websiteId}. */
    dashboardUrl?: string | false;
    /** Timeout of a call, in milliseconds (15 s by default). */
    timeoutMs?: number;
}
export type Point = {
    x: string;
    y: number;
};
export interface UmamiStats {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
}
export interface Expanded {
    name: string;
    pageviews: number | string;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
}
export interface UmamiSession {
    country?: string | null;
    city?: string | null;
    device?: string | null;
    browser?: string | null;
    os?: string | null;
    views?: number;
    lastAt?: string | null;
    createdAt?: string | null;
}
export declare const umamiConfigured: (c: UmamiConfig | null | undefined) => c is UmamiConfig;
/** Totals of a `stats` response, whatever the Umami version. */
export declare const parseStats: (s: Record<string, unknown> | null | undefined) => UmamiStats;
export interface UmamiClient {
    readonly config: UmamiConfig;
    get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
    /** Ranking of a dimension; "path" is retried as "url" (Umami 2) if Umami refuses it. */
    metric(type: string, startAt: number, endAt: number, limit?: number, extra?: Record<string, string>): Promise<Point[]>;
    /** Forgets the token (tests). */
    reset(): void;
}
export declare function umamiClient(config: UmamiConfig, fetchFn?: Fetch): UmamiClient;
