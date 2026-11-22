import { type SearchOverview, type StatsOverview, type Texts, type World, type YoutubeOverview } from 'stats-kit/contract';
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
export interface ReportInput {
    overview: StatsOverview;
    search?: SearchOverview | null;
    youtube?: YoutubeOverview | null;
    /** Most viewed video of the period (report). */
    youtubeTop?: {
        title: string;
        url: string;
        views: number;
    } | null;
    texts: Texts;
    theme: ReportTheme;
    siteName: string;
    /** Statistics page of the administration (report button). */
    statsUrl?: string | null;
    /** Weekly report (different subject). */
    weekly?: boolean;
    /** Base map; `null`: no map. */
    world: World | null;
    /** "At a glance" card: top source, country, page and entry page, best day, busiest slot (true by default). */
    glance?: boolean;
    /** Site-specific cards, shown after the rankings (costs, requests, news of the site…). */
    blocks?: ReportBlock[];
}
/** Site-specific card of the report: a title, then figures and/or lines, all given by the site in its language. */
export interface ReportBlock {
    title: string;
    hint?: string;
    /** Key figures, side by side (up to three per row). */
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
