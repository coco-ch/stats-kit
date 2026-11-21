import { type Fetch } from './http.ts';
export interface UmamiConfig {
    /** Adresse d'Umami (« https://umami.exemple.org ») ; l'API est sous /api. Pour Umami Cloud : « https://api.umami.is/v1 » avec `apiKey`. */
    url: string;
    /** Identifiant du site dans Umami. */
    websiteId: string;
    /** Compte de service (lecture) d'un Umami auto-hébergé. */
    username?: string;
    password?: string;
    /** Clé d'API (Umami Cloud) : remplace le compte de service. */
    apiKey?: string;
    /** Tableau de bord ouvert par le bouton « Ouvrir Umami » ; `false` pour ne pas l'afficher. Défaut : {url}/websites/{websiteId}. */
    dashboardUrl?: string | false;
    /** Délai d'attente d'un appel, en millisecondes (15 s par défaut). */
    timeoutMs?: number;
}
export type Point = {
    x: string;
    y: number;
};
export interface UmamiStats {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
}
export interface Expanded {
    name: string;
    pageviews: number | string;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
}
export interface UmamiSession {
    country?: string | null;
    city?: string | null;
    device?: string | null;
    browser?: string | null;
    os?: string | null;
    views?: number;
    lastAt?: string | null;
    createdAt?: string | null;
}
export declare const umamiConfigured: (c: UmamiConfig | null | undefined) => c is UmamiConfig;
/** Totaux d'une réponse `stats`, quelle que soit la version d'Umami. */
export declare const parseStats: (s: Record<string, unknown> | null | undefined) => UmamiStats;
export interface UmamiClient {
    readonly config: UmamiConfig;
    get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
    /** Classement d'une dimension ; « path » est retenté en « url » (Umami 2) si Umami le refuse. */
    metric(type: string, startAt: number, endAt: number, limit?: number, extra?: Record<string, string>): Promise<Point[]>;
    /** Oublie le jeton (tests). */
    reset(): void;
}
export declare function umamiClient(config: UmamiConfig, fetchFn?: Fetch): UmamiClient;
