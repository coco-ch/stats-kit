import { type SearchOverview, type StatsOverview, type Texts, type World, type YoutubeOverview } from 'stats-kit/contract';
import type { ReportDaily } from './daily.ts';
import { type ReportTheme } from './theme.ts';
/** Attachment shown in the message ("cid:"). */
export interface InlineAttachment {
    cid: string;
    filename: string;
    contentType: string;
    content: Uint8Array;
}
/** Message ready to be handed to the site's sending function. */
export interface ReportMessage {
    subject: string;
    html: string;
    text: string;
    attachments: InlineAttachment[];
}
/** Video of the report: title (or the site's label), address, views over the period. */
export interface ReportVideo {
    title: string;
    url: string;
    views: number;
}
export interface ReportInput {
    overview: StatsOverview;
    search?: SearchOverview | null;
    youtube?: YoutubeOverview | null;
    /** Most viewed videos of the period, most viewed first (report). */
    youtubeVideos?: ReportVideo[] | null;
    /** @deprecated since 0.2.9, use `youtubeVideos`. Most viewed video of the period. */
    youtubeTop?: ReportVideo | null;
    texts: Texts;
    theme: ReportTheme;
    siteName: string;
    /** Statistics page of the administration (report button). */
    statsUrl?: string | null;
    /** Google and YouTube pages of the administration (link at the end of their block). */
    searchUrl?: string | null;
    youtubeUrl?: string | null;
    /** Weekly report (different subject). */
    weekly?: boolean;
    /** Base map; `null`: no map. */
    world: World | null;
    /** "At a glance" card: top source, country, page and entry page, best day, busiest slot (true by default). */
    glance?: boolean;
    /** Site-specific cards, shown after the rankings (costs, requests, news of the site…). */
    blocks?: ReportBlock[];
    /** Business figures of the site (requests, customers, subscriptions, service status…), shown first, under the sentence. */
    business?: ReportBusiness | null;
    /** Visits and bounces day by day (charts of the "Visits" and "Bounce" figures); without them, no chart there. */
    daily?: ReportDaily | null;
    /** Occurrences of each goal per slot, by goal id (charts of the goals). */
    goalSeries?: Record<string, number[]> | null;
}
/**
 * Site-specific card of the report: a title, then figures and/or lines, all given by the site in its language. Amounts are best
 * formatted with `formatMoney(kit.texts, 12.5, 'USD')` ("$12.50", "12,50 $").
 */
export interface ReportBlock {
    title: string;
    hint?: string;
    /** Key figures, on one light line (three per row, two on a phone). */
    figures?: {
        value: string;
        label: string;
        sub?: string;
    }[];
    /** Lines of text, bulleted. */
    lines?: string[];
}
/**
 * Business figures of the site, at the top of the report: what the site itself counts (requests received and to handle,
 * customers, trials, subscriptions, revenue, documents, messages, costs…), with the state of its services. Every text is given by
 * the site in its language; numbers and amounts are formatted by the library in the language of the report.
 */
export interface ReportBusiness {
    /** Title of the section (default: `report.businessTitle`, "Your business"). */
    title?: string | null;
    /** Line under the title (default: `report.businessHint`). */
    hint?: string | null;
    /** Key figures, four per row (two by two on a phone), in the given order; figures of the same `group` together under its name. */
    kpis: BusinessKpi[];
    /** State of the services and alerts, under the figures. */
    status?: BusinessStatus | null;
    /** Link to the administration, at the end of the section. */
    link?: {
        url: string;
        label: string;
    } | null;
}
/** A business figure. Leave out a figure the site cannot read: never a zero standing for "unknown". */
export interface BusinessKpi {
    /** Stable identifier (name of its chart image). */
    id: string;
    label: string;
    /** Number (formatted in the language of the report), or a text already formatted ("3 of 5"). */
    value: number | string;
    /** Value of the previous period (a number value only): change shown under the figure. */
    previous?: number | null;
    /** ISO 4217 currency of a number value: formatted as an amount ("1 490 €", "$12.50"). */
    currency?: string | null;
    /** Line under the figure ("2 to handle", "ends within 7 days"). */
    sub?: string | null;
    /** Values per slot of the period, oldest first: a small chart (two values at least). */
    series?: number[] | null;
    /** A figure that should go down (costs, errors): a fall is good news. */
    lowerIsBetter?: boolean;
    /** Something to do (requests to handle…): the figure is shown in amber. */
    highlight?: boolean;
    /** Name of the group of the figure ("Requests", "Customers"…). */
    group?: string | null;
    /** Screen of the administration where to act. */
    link?: {
        url: string;
        label: string;
    } | null;
}
/** State of the site's services: overall tone, a title, and the alerts in lines. */
export interface BusinessStatus {
    tone: 'ok' | 'warn' | 'down';
    title: string;
    lines?: string[];
}
export declare const MAP_CID = "stats-kit-map";
export declare const LOGO_CID = "stats-kit-logo";
/** Preview: the attached images are replaced by their content, to be shown outside a mail client. */
export declare function previewHtml(m: ReportMessage): string;
export declare function buildReport(input: ReportInput): ReportMessage;
