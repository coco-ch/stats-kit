import { type SearchOverview, type StatsOverview, type Texts, type World, type YoutubeOverview } from 'stats-kit/contrat';
import { type ReportTheme } from './theme.ts';
/** Pièce jointe affichée dans le message (« cid: »). */
export interface InlineAttachment {
    cid: string;
    filename: string;
    contentType: string;
    content: Uint8Array;
}
/** Message prêt à remettre à la fonction d'envoi du site. */
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
    /** Vidéo la plus vue de la période (rapport). */
    youtubeTop?: {
        title: string;
        url: string;
        views: number;
    } | null;
    texts: Texts;
    theme: ReportTheme;
    siteName: string;
    /** Page Statistiques de l'administration (bouton du rapport). */
    statsUrl?: string | null;
    /** Rapport hebdomadaire (objet différent). */
    weekly?: boolean;
    /** Fond de carte ; `null` : pas de carte. */
    world: World | null;
}
export declare const MAP_CID = "stats-kit-carte";
export declare const LOGO_CID = "stats-kit-logo";
/** Aperçu : les images jointes sont remplacées par leur contenu, pour s'afficher hors d'une messagerie. */
export declare function previewHtml(m: ReportMessage): string;
export declare function buildReport(input: ReportInput): ReportMessage;
