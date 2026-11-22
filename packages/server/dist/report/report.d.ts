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
export declare const MAP_CID = "stats-kit-map";
export declare const LOGO_CID = "stats-kit-logo";
/** Preview: the attached images are replaced by their content, to be shown outside a mail client. */
export declare function previewHtml(m: ReportMessage): string;
export declare function buildReport(input: ReportInput): ReportMessage;
