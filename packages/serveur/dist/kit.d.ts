import { type IndexationResponse, type Item, type LiveResponse, type ReportSendResult, type SearchOverview, type StatsOverview, type TextOverrides, type Texts, type World, type YoutubeOverview } from 'stats-kit/contrat';
import { type OverviewOptions } from './apercu.ts';
import { type GscConfig } from './gsc.ts';
import { type Fetch } from './http.ts';
import { type ReportMessage } from './rapport/rapport.ts';
import type { ReportTheme } from './rapport/theme.ts';
import { type RangeQuery } from './temps.ts';
import { type UmamiConfig } from './umami.ts';
import { type YoutubeConfig } from './youtube.ts';
export interface ReportConfig {
    /** Couleurs et logo (défaut : bleu neutre). */
    theme?: ReportTheme;
    /** Page Statistiques de l'administration, ouverte par le bouton du rapport. */
    statsUrl?: string | null;
    /** Jours couverts par défaut (7). */
    days?: number;
    /**
     * Envoi du message, fait par le site (SMTP, API…) : la librairie n'envoie rien elle-même. Renvoie le nombre de destinataires
     * (ou rien). Sans cette fonction, la route d'envoi répond 503.
     */
    send?: (message: ReportMessage) => Promise<number | void>;
    /** Ajoute le bloc Google (true par défaut, si la Search Console est branchée). */
    search?: boolean;
    /** Ajoute le bloc YouTube (true par défaut, si la chaîne est branchée). */
    youtube?: boolean;
}
export interface StatsKitConfig extends Omit<OverviewOptions, 'timeZone' | 'dashboardUrl'> {
    /** Nom du site (en-tête et objet du rapport). */
    siteName: string;
    /** Langue des textes : « fr » (défaut), « en », ou une autre avec `baseTexts`. */
    locale?: string;
    /** Remplacements de textes (réglages du site). */
    texts?: TextOverrides;
    /** Textes complets d'une autre langue. */
    baseTexts?: Texts;
    /** Fuseau des créneaux et du rapport (« Europe/Paris ») ; UTC par défaut. */
    timeZone?: string;
    umami?: UmamiConfig | null;
    gsc?: GscConfig | null;
    youtube?: YoutubeConfig | null;
    /** Demandes enregistrées par le site après une visite venue d'une source (`utm_source`), pour la page YouTube. */
    sourceRequests?: (from: number, to: number, source: string) => Promise<{
        total: number;
        bySubject: Item[];
    }>;
    report?: ReportConfig;
    /** Durée de vie du cache de la vue d'ensemble (2 minutes par défaut). */
    cacheTtlMs?: number;
    /** `fetch` à utiliser (tests, proxy). */
    fetch?: Fetch;
    /** Horloge (tests). */
    now?: () => number;
    /** Fond de carte (défaut : celui livré avec la librairie) ; `null` pour un rapport sans carte. */
    world?: World | URL | string | null;
}
/** Requête HTTP réduite à ce dont les routes ont besoin. */
export interface KitRequest {
    method: string;
    /** Chemin relatif au point de montage (« /overview »). */
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
    /** Rapport des `days` derniers jours (7 par défaut). */
    report(q?: RangeQuery, weekly?: boolean): Promise<ReportMessage>;
    /** Construit le rapport et le remet à `report.send`. */
    sendReport(q?: RangeQuery, weekly?: boolean): Promise<ReportSendResult>;
    /** Fond de carte (GeoJSON) servi aux composants. */
    worldJson(): string | null;
    handle(req: KitRequest): Promise<KitResponse>;
    /** Intergiciel Express / `node:http` : `app.use('/api/admin/audience', protégé, kit.middleware())`. */
    middleware(): (req: {
        method?: string;
        url?: string;
    }, res: NodeResponse, next?: (err?: unknown) => void) => void;
}
/** Ce que l'intergiciel utilise de la réponse Node. */
export interface NodeResponse {
    statusCode: number;
    setHeader(name: string, value: string): unknown;
    end(body?: string): unknown;
}
export declare function createStatsKit(config: StatsKitConfig): StatsKit;
