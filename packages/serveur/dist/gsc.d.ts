import type { IndexationResponse, SearchOverview, SourceStatus } from 'stats-kit/contrat';
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
    /** Propriété Search Console : « sc-domain:exemple.org » ou « https://www.exemple.org/ ». */
    property: string;
    /** Clé JSON du compte de service : objet, texte JSON, ou ce texte encodé en base64. */
    serviceAccount?: ServiceKey | string;
    /** Identifiants OAuth : objet, texte JSON, ou base64. */
    oauth?: OauthCredentials | string;
    /** Mots du nom du site (recherches « marque »). */
    brandTerms?: string[];
    /** Plan du site lu pour la vérification d'indexation (« https://www.exemple.org/sitemap.xml »). */
    sitemapUrl?: string;
    /** Adresses du plan du site à contrôler (toutes par défaut, 200 au plus). */
    indexationFilter?: (url: string) => boolean;
    /** Langue des messages d'inspection (« fr-FR »). */
    languageCode?: string;
    /** Adresses des API (tests de bout en bout : faux Google local). */
    apiUrl?: string;
    inspectUrl?: string;
    tokenUrl?: string;
}
/** Lit un JSON donné tel quel, en base64, ou déjà en objet ; `null` s'il n'a pas les champs demandés. */
export declare function parseCredentials<T>(raw: T | string | undefined | null, fields: (keyof T)[]): T | null;
export declare const gscKey: (c: GscConfig | null | undefined) => ServiceKey | null;
export declare const gscOauth: (c: GscConfig | null | undefined) => OauthCredentials | null;
export declare const gscConfigured: (c: GscConfig | null | undefined) => c is GscConfig;
/** JWT d'assertion signé en RS256, valable une heure. */
export declare function signJwt(k: ServiceKey, scope?: string, now?: number): string;
/**
 * Période et période précédente de même durée. Google publie avec deux à trois jours de retard : la période se termine au plus tard
 * deux jours avant aujourd'hui. Bornes personnalisées (AAAA-MM-JJ) limitées à 16 mois.
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
/** Réponse vide de même forme (non configuré ou erreur). */
export declare function emptySearch(status: SourceStatus, error: string | null, period: ReturnType<typeof searchPeriod>, config?: GscConfig | null, now?: number): SearchOverview;
export declare function gscClient(config: GscConfig, fetchFn?: Fetch): GscClient;
