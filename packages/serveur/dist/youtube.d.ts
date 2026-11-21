import type { Item, YoutubeOverview, YoutubeSite } from 'stats-kit/contrat';
import { type Fetch } from './http.ts';
export interface YoutubeConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    /** Chaîne attendue : une autre chaîne (mauvais jeton) est refusée. */
    channelId?: string;
    /** Adresse publique de la chaîne (affichée même sans réglage). */
    channelUrl?: string;
    /** Valeur de `utm_source` des liens publiés sur la chaîne (« youtube »). */
    utmSource?: string;
    /** Libellé d'une vidéo donné par le site (nom du film…). */
    videoLabel?: (video: {
        id: string;
        title: string;
    }) => string | null | undefined;
    /** Vidéos à suivre en plus de celles de la liste « mises en ligne » (anciennes versions non répertoriées…). */
    extraVideoIds?: () => string[] | Promise<string[]>;
    tokenUrl?: string;
    apiUrl?: string;
    analyticsUrl?: string;
}
export declare const youtubeConfigured: (c: YoutubeConfig | null | undefined) => c is YoutubeConfig;
/** Durée ISO 8601 de YouTube (« PT1M20S ») en secondes. */
export declare function isoSeconds(iso: string | undefined): number;
interface Table {
    columnHeaders?: {
        name: string;
    }[];
    rows?: unknown[][];
}
/** Réponse de YouTube Analytics en lignes nommées. */
export declare const tableRows: (t: Table) => Record<string, string | number>[];
/** Ce que le site compte de son côté (visites venues de YouTube, demandes) : fourni par le kit. */
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
    /** Vidéo la plus vue sur une période (rapport). */
    topVideo(start: string, end: string): Promise<{
        title: string;
        url: string;
        views: number;
    } | null>;
    reset(): void;
}
/** Réponse de même forme sans chaîne (non configuré ou erreur). */
export declare function emptyYoutube(status: 'not-configured' | 'error', error: string | null, days: number, channelUrl: string | null, now?: number): YoutubeOverview;
/** Visites et demandes venues de YouTube sur la période et la précédente ; `null` si le site ne compte rien. */
export declare function siteSide(site: SiteCounter | undefined, source: string, days: number, now: number): Promise<YoutubeSite | null>;
export declare function youtubeClient(config: YoutubeConfig, fetchFn?: Fetch): YoutubeClient;
export {};
