/** Contract version; it changes with every incompatible change. */
export type ContractVersion = 1;
/** State of a source: `ok`, `not-configured` (no settings: nothing is called) or `error` (the source did not answer). */
export type SourceStatus = 'ok' | 'not-configured' | 'error';
/** Granularity of a series: one point per day or per hour. */
export type Unit = 'day' | 'hour';
/** Period shown and previous period of the same length. */
export interface Range {
    /** Start (included), UTC instant. */
    from: string;
    /** End (excluded), UTC instant. */
    to: string;
    /** Number of days covered (1 for the last 24 hours). */
    days: number;
    /** Granularity of the main series: `hour` for 24 hours, `day` beyond. */
    unit: Unit;
    /** IANA time zone of the slots ("Europe/Paris"). */
    timeZone: string;
    /** Start of the previous period, UTC instant. */
    previousFrom: string;
    /** End of the previous period (= start of the period), UTC instant. */
    previousTo: string;
}
/** Totals of a period. */
export interface Totals {
    /** Page views. */
    pageviews: number;
    /** Distinct visitors. */
    visitors: number;
    /** Visits (sessions). */
    visits: number;
    /** Single-page visits. */
    bounces: number;
    /** Cumulated time spent, in seconds. */
    totaltime: number;
}
/** Row of a ranking (page, country, source…). */
export interface Item {
    /** Raw value returned by the source: path, ISO country code, language code, event name… */
    key: string;
    /** Readable label given by the server (site settings); otherwise the components compute one from `key`. */
    label: string | null;
    /** Number (visits, views or occurrences depending on the ranking). */
    value: number;
    /** Same number over the previous period; `null` if the source does not provide it. */
    previous: number | null;
}
/** Continuous time series: one slot per day or hour of the period, even without data (zero). */
export interface Series {
    unit: Unit;
    /** Slots in the time zone of the period: "YYYY-MM-DD" (day) or "YYYY-MM-DDTHH" (hour). */
    slots: string[];
    /** Page views, one value per slot. */
    pageviews: number[];
    /** Visitors (Umami sessions), one value per slot. */
    visitors: number[];
    /** Page views of the previous period, aligned slot by slot; `null` if unknown. */
    previousPageviews: number[] | null;
}
/** Detail of a page (all languages together if the site groups its paths). */
export interface PageRow {
    /** Logical path ("/contact"). */
    key: string;
    label: string | null;
    views: number;
    visitors: number;
    /** Visits that started on this page. */
    entries: number;
    /** Visits that ended on this page. */
    exits: number;
    /** Single-page visits that started here. */
    bounces: number;
    /** Cumulated time spent on the page, in seconds. */
    totaltime: number;
    /** Views of the previous period; `null` if unknown. */
    previousViews: number | null;
}
/** Recent visit, without identifying the person. */
export interface Session {
    /** ISO 3166-1 alpha-2 country code. */
    country: string | null;
    city: string | null;
    device: string | null;
    browser: string | null;
    os: string | null;
    views: number;
    /** Last activity, UTC instant. */
    lastAt: string | null;
}
/** Goal of the site: total of one or more tracked events (click to call, form sent…). */
export interface Goal {
    id: string;
    label: string;
    value: number;
    previous: number | null;
}
/** Group of pages defined by the site (product pages, articles…). */
export interface ItemGroup {
    id: string;
    title: string;
    items: Item[];
}
/** Section of the Statistics page where a table goes. */
export type Section = 'pages' | 'sources' | 'audience' | 'actions';
/** Figure tile added by the site (data from its own database: requests received, orders…). */
export interface ExtraTile {
    id: string;
    label: string;
    /** Number, or text already formatted. */
    value: number | string;
    previous: number | null;
    /** Context under the figure. */
    sub: string | null;
    /** Title of the tile group; `null`: the site data group. */
    group: string | null;
    /** Highlighted (to handle, pending…). */
    highlight: boolean;
}
/** Table added by the site. */
export interface ExtraTable {
    id: string;
    title: string;
    sub: string | null;
    /** Title of the label column. */
    head: string;
    /** Title of the number column. */
    column: string;
    section: Section;
    items: Item[];
}
/** Site's own data, shown with the sources' data (shown even if Umami does not answer). */
export interface Extras {
    tiles: ExtraTile[];
    tables: ExtraTable[];
    /** Last step of the funnel ("Requests received"); `null` without a step. */
    funnel: {
        label: string;
        value: number;
    } | null;
}
/** Rankings of a period. Each list is sorted by decreasing value. */
export interface Breakdowns {
    /** Page views by logical path. */
    pages: Item[];
    /** Entry pages (visits). */
    entries: Item[];
    /** Exit pages (visits). */
    exits: Item[];
    /** Sites the visits come from (domain; empty key = direct access). */
    referrers: Item[];
    /** Umami acquisition channels (direct, organicSearch…). */
    channels: Item[];
    /** Countries (ISO code). */
    countries: Item[];
    /** Regions ("FR-PAC"). */
    regions: Item[];
    cities: Item[];
    /** Browser language of the visitors (code). */
    languages: Item[];
    /** Site language viewed (path prefix), if the site is multilingual. */
    siteLanguages: Item[];
    /** Devices (desktop, laptop, mobile, tablet). */
    devices: Item[];
    browsers: Item[];
    os: Item[];
    /** Screen sizes ("390x844"). */
    screens: Item[];
    /** Tracked events (name). */
    events: Item[];
    /** Addresses (host names) visited. */
    hostnames: Item[];
    utmSources: Item[];
    utmMediums: Item[];
    utmCampaigns: Item[];
}
/** Number of distinct dimensions over the period (`null` if the source does not give it). */
export interface Counts {
    countries: number | null;
    events: number | null;
}
/** Response of `GET {base}/overview`: everything the Statistics page shows. */
export interface StatsOverview {
    version: ContractVersion;
    status: SourceStatus;
    /** Short message when `status` is `error`. */
    error: string | null;
    /** Computation instant, UTC. */
    generatedAt: string;
    range: Range;
    totals: Totals;
    /** Totals of the previous period; `null` if unknown. */
    previous: Totals | null;
    /** Visitors active right now (last 5 minutes); `null` if unknown. */
    active: number | null;
    series: Series;
    /** Last 24 hours, hour by hour (whatever the chosen period). */
    last24h: Series;
    /** Page views by weekday (Monday = 0) and hour (0 to 23), in the time zone of the period: 7 rows of 24 numbers. */
    heatmap: number[][];
    breakdowns: Breakdowns;
    /** Detail by page; empty if the source does not provide it (the components then fall back to `breakdowns.pages`). */
    pages: PageRow[];
    groups: ItemGroup[];
    goals: Goal[];
    counts: Counts;
    sessions: Session[];
    extras: Extras | null;
    /** Address of the source dashboard (Umami), to go further; `null` to hide it. */
    dashboardUrl: string | null;
}
/** Response of `GET {base}/live`: active visitors. */
export interface LiveResponse {
    version: ContractVersion;
    active: number | null;
    at: string;
}
export interface SearchTotals {
    clicks: number;
    impressions: number;
    /** Click-through rate, from 0 to 1. */
    ctr: number;
    /** Average position (1 = first result); 0 without impressions. */
    position: number;
}
export interface SearchRow extends SearchTotals {
    /** Query, page address, ISO 3166-1 alpha-3 country code (lower case, as Google gives it), device… */
    key: string;
}
export interface SearchDay extends SearchTotals {
    date: string;
}
export interface QueryPage extends SearchTotals {
    query: string;
    page: string;
}
export interface Sitemap {
    path: string;
    lastDownloaded: string | null;
    errors: number;
    warnings: number;
    pending: boolean;
    submitted: number;
    indexed: number | null;
}
/** Response of `GET {base}/search`: performance in Google Search. */
export interface SearchOverview {
    version: ContractVersion;
    status: SourceStatus;
    error: string | null;
    generatedAt: string;
    /** Search Console property ("sc-domain:example.org"). */
    property: string | null;
    /** Address of the service account to add as a user of the property; `null` with OAuth or without settings. */
    serviceAccount: string | null;
    /** Period (days included): Google publishes two to three days late, so it ends before today. */
    start: string;
    end: string;
    days: number;
    previousStart: string;
    previousEnd: string;
    totals: SearchTotals;
    previous: SearchTotals;
    series: SearchDay[];
    previousSeries: SearchDay[];
    queries: SearchRow[];
    previousQueries: SearchRow[];
    pages: SearchRow[];
    previousPages: SearchRow[];
    countries: SearchRow[];
    previousCountries: SearchRow[];
    devices: SearchRow[];
    previousDevices: SearchRow[];
    /** Search appearance (rich results, videos…). */
    appearance: SearchRow[];
    queryPages: QueryPage[];
    /** Sitemaps; `null` if Google refused them. */
    sitemaps: Sitemap[] | null;
    /** Words of the site name: separate brand queries from the others. */
    brandTerms: string[];
}
export interface Inspection {
    url: string;
    /** PASS, NEUTRAL, FAIL, UNKNOWN or ERROR. */
    verdict: string;
    state: string;
    lastCrawl: string | null;
    indexed: boolean;
}
/** Response of `GET {base}/search/indexation`: indexing state page by page (slow: kept for several hours). */
export interface IndexationResponse {
    version: ContractVersion;
    status: SourceStatus;
    error: string | null;
    checkedAt: string;
    total: number;
    indexed: number;
    pages: Inspection[];
}
export interface YoutubeChannel {
    id: string;
    title: string;
    handle: string | null;
    url: string;
    studioUrl: string;
    thumbnail: string | null;
    /** `null` if the channel hides its subscriber count. */
    subscribers: number | null;
    views: number;
    videos: number;
    createdAt: string | null;
}
export interface YoutubeVideo {
    id: string;
    url: string;
    title: string;
    /** Label given by the site (film name…), or `null`. */
    label: string | null;
    publishedAt: string | null;
    /** Duration in seconds. */
    duration: number;
    /** public, unlisted or private. */
    visibility: string;
    views: number;
    likes: number | null;
    comments: number | null;
    /** Minutes watched since publication (YouTube Analytics); `null` as long as YouTube has counted nothing. */
    minutes: number | null;
    averageViewDuration: number | null;
    /** Average percentage watched (0 to 100). */
    averageViewPercentage: number | null;
}
export interface YoutubeDay {
    date: string;
    views: number;
    minutes: number;
    gained: number;
    lost: number;
}
export interface YoutubeTotals {
    views: number;
    minutes: number;
    gained: number;
    lost: number;
    /** Average duration watched per view, in seconds. */
    averageViewDuration: number;
}
export interface YoutubeTraffic {
    /** YouTube traffic source type (YT_SEARCH, RELATED_VIDEO…). */
    source: string;
    views: number;
    minutes: number;
}
/** What the channel brings to the site: visits through a tracked link (`utm_source`) and the requests that follow. */
export interface YoutubeSite {
    /** `null` if Umami is not connected or did not answer. */
    visits: number | null;
    visitors: number | null;
    previousVisits: number | null;
    /** Visits from a YouTube domain, tracked link or not. */
    referred: number | null;
    /** Landing pages. */
    landing: Item[];
    /** Requests recorded by the site after such a visit; `null` if the site does not count them. */
    requests: number | null;
    previousRequests: number | null;
    requestsBySubject: Item[];
}
/** Response of `GET {base}/youtube`: the channel, its videos and its statistics. */
export interface YoutubeOverview {
    version: ContractVersion;
    status: SourceStatus;
    error: string | null;
    generatedAt: string;
    /** Public channel (useful link even without settings); `null` if unknown. */
    channelUrl: string | null;
    channel: YoutubeChannel | null;
    videos: YoutubeVideo[];
    /** Days of the chosen period. */
    days: number;
    start: string;
    end: string;
    totals: YoutubeTotals;
    previous: YoutubeTotals;
    /** 180 days, oldest first, up to yesterday (YouTube publishes one to two days late). */
    series: YoutubeDay[];
    traffic: YoutubeTraffic[];
    /** Message if YouTube Analytics refused (the channel and the videos are shown anyway). */
    analyticsError: string | null;
    site: YoutubeSite | null;
}
/** Response of `GET {base}/report/preview`: the report as it would be sent, images included. */
export interface ReportPreview {
    version: ContractVersion;
    subject: string;
    html: string;
    text: string;
}
/** Response of `POST {base}/report/send`. */
export interface ReportSendResult {
    version: ContractVersion;
    ok: boolean;
    /** Number of recipients reported by the site. */
    recipients: number;
    error: string | null;
}
/** All the responses (root of the JSON schema). */
export interface Contract {
    overview: StatsOverview;
    live: LiveResponse;
    search: SearchOverview;
    indexation: IndexationResponse;
    youtube: YoutubeOverview;
    reportPreview: ReportPreview;
    reportSend: ReportSendResult;
}
