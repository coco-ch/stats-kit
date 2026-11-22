import { type IndexationResponse, type Item, type LiveResponse, type ReportSendResult, type SearchOverview, type StatsOverview, type TextOverrides, type Texts, type World, type YoutubeOverview } from 'stats-kit/contract';
import { type OverviewOptions } from './overview.ts';
import { type GscConfig } from './gsc.ts';
import { type Fetch } from './http.ts';
import { type ReportBlock, type ReportMessage } from './report/report.ts';
import type { ReportTheme } from './report/theme.ts';
import { type RangeQuery } from './time.ts';
import { type UmamiConfig } from './umami.ts';
import { type YoutubeConfig } from './youtube.ts';
export interface ReportConfig {
    /** Colours and logo (default: neutral blue). */
    theme?: ReportTheme;
    /** Statistics page of the administration, opened by the report button. */
    statsUrl?: string | null;
    /** Days covered by default (7). */
    days?: number;
    /**
     * Sending of the message, done by the site (SMTP, API…): the library sends nothing itself. Returns the number of recipients
     * (or nothing). Without this function, the send route answers 503.
     */
    send?: (message: ReportMessage) => Promise<number | void>;
    /** Adds the Google block (true by default, if Search Console is connected). */
    search?: boolean;
    /** Adds the YouTube block (true by default, if the channel is connected). */
    youtube?: boolean;
    /** Adds the "At a glance" card: top source, country, page and entry page, best day, busiest slot (true by default). */
    glance?: boolean;
    /**
     * Site-specific cards (costs, requests, news…), shown after the rankings; given in the site's language. A failure of this
     * function is logged and the report is sent without these cards.
     */
    blocks?: (overview: StatsOverview) => ReportBlock[] | Promise<ReportBlock[]>;
}
export interface StatsKitConfig extends Omit<OverviewOptions, 'timeZone' | 'dashboardUrl'> {
    /** Site name (header and subject of the report). */
    siteName: string;
    /** Language of the texts: "en" (default), "fr", "de", "es", "it", "pt", "nl", a tag with a region ("fr-CH"), or another language with `baseTexts`. */
    locale?: string;
    /** Text overrides (site settings). */
    texts?: TextOverrides;
    /** Complete texts of another language. */
    baseTexts?: Texts;
    /** Time zone of the slots and of the report ("Europe/Paris"); UTC by default. */
    timeZone?: string;
    umami?: UmamiConfig | null;
    gsc?: GscConfig | null;
    youtube?: YoutubeConfig | null;
    /** Requests recorded by the site after a visit from a source (`utm_source`), for the YouTube page. */
    sourceRequests?: (from: number, to: number, source: string) => Promise<{
        total: number;
        bySubject: Item[];
    }>;
    report?: ReportConfig;
    /** Time to live of the overview cache (2 minutes by default). */
    cacheTtlMs?: number;
    /** `fetch` to use (tests, proxy). */
    fetch?: Fetch;
    /** Clock (tests). */
    now?: () => number;
    /** Base map (default: the one shipped with the library); `null` for a report without a map. */
    world?: World | URL | string | null;
}
/** HTTP request reduced to what the routes need. */
export interface KitRequest {
    method: string;
    /** Path relative to the mount point ("/overview"). */
    path: string;
    query: Record<string, string | undefined>;
}
export interface KitResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
}
export interface StatsKit {
    readonly texts: Texts;
    overview(q?: RangeQuery): Promise<StatsOverview>;
    live(): Promise<LiveResponse>;
    search(q?: RangeQuery): Promise<SearchOverview>;
    indexation(): Promise<IndexationResponse>;
    youtube(days?: number): Promise<YoutubeOverview>;
    /** Report of the last `days` days (7 by default). */
    report(q?: RangeQuery, weekly?: boolean): Promise<ReportMessage>;
    /** Builds the report and hands it to `report.send`. */
    sendReport(q?: RangeQuery, weekly?: boolean): Promise<ReportSendResult>;
    /** Base map (GeoJSON) served to the components. */
    worldJson(): string | null;
    handle(req: KitRequest): Promise<KitResponse>;
    /** Express / `node:http` middleware: `app.use('/api/admin/audience', requireAdmin, kit.middleware())`. */
    middleware(): (req: {
        method?: string;
        url?: string;
    }, res: NodeResponse, next?: (err?: unknown) => void) => void;
}
/** What the middleware uses of the Node response. */
export interface NodeResponse {
    statusCode: number;
    setHeader(name: string, value: string): unknown;
    end(body?: string): unknown;
}
export declare function createStatsKit(config: StatsKitConfig): StatsKit;
