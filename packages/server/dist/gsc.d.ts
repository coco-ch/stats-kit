import type { IndexationResponse, SearchOverview, SourceStatus } from 'stats-kit/contract';
import { type Fetch } from './http.ts';
export interface ServiceKey {
    client_email: string;
    private_key: string;
    token_uri?: string;
}
export interface OauthCredentials {
    client_id: string;
    client_secret: string;
    refresh_token: string;
}
export interface GscConfig {
    /** Search Console property: "sc-domain:example.org" or "https://www.example.org/". */
    property: string;
    /** JSON key of the service account: object, JSON text, or that text encoded in base64. */
    serviceAccount?: ServiceKey | string;
    /** OAuth credentials: object, JSON text, or base64. */
    oauth?: OauthCredentials | string;
    /** Words of the site name (brand queries). */
    brandTerms?: string[];
    /** Sitemap read for the indexing check ("https://www.example.org/sitemap.xml"). */
    sitemapUrl?: string;
    /** Sitemap addresses to check (all by default, at most 200). */
    indexationFilter?: (url: string) => boolean;
    /** Language of the inspection messages ("en-US"); defaults to the kit locale. */
    languageCode?: string;
    /** API addresses (end-to-end tests: local fake Google). */
    apiUrl?: string;
    inspectUrl?: string;
    tokenUrl?: string;
}
/** Reads JSON given as is, in base64, or already as an object; `null` if it lacks the requested fields. */
export declare function parseCredentials<T>(raw: T | string | undefined | null, fields: (keyof T)[]): T | null;
export declare const gscKey: (c: GscConfig | null | undefined) => ServiceKey | null;
export declare const gscOauth: (c: GscConfig | null | undefined) => OauthCredentials | null;
export declare const gscConfigured: (c: GscConfig | null | undefined) => c is GscConfig;
/** Assertion JWT signed with RS256, valid for one hour. */
export declare function signJwt(k: ServiceKey, scope?: string, now?: number): string;
/**
 * Period and previous period of the same length. Google publishes two to three days late: the period ends at the latest two days
 * before today. Custom bounds (YYYY-MM-DD) limited to 16 months.
 */
export declare function searchPeriod(q: {
    days?: unknown;
    from?: unknown;
    to?: unknown;
}, now?: number): {
    days: number;
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
};
export interface GscClient {
    overview(q: {
        days?: unknown;
        from?: unknown;
        to?: unknown;
    }, now?: number): Promise<SearchOverview>;
    indexation(now?: number): Promise<IndexationResponse>;
    reset(): void;
}
/** Empty response of the same shape (not configured or error). */
export declare function emptySearch(status: SourceStatus, error: string | null, period: ReturnType<typeof searchPeriod>, config?: GscConfig | null, now?: number): SearchOverview;
export declare function gscClient(config: GscConfig, fetchFn?: Fetch): GscClient;
