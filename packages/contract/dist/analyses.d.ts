import type { QueryPage, SearchRow, YoutubeDay, YoutubeTotals } from './types.ts';
/** Texte sans accents ni majuscules, pour comparer des recherches. */
export declare const normalize: (s: string) => string;
/** Recherche « marque » : elle contient l'un des mots du nom du site. */
export declare function isBrand(query: string, terms: string[]): boolean;
/** Taux de clic moyen observé en 3e position, base de l'estimation des clics à gagner. */
export declare const CTR_AT_3 = 0.11;
export interface Potential extends SearchRow {
    /** Clics supplémentaires estimés si la recherche montait en 3e position. */
    gain: number;
}
/** Recherches visibles en position 4 à 20, classées par clics à gagner. */
export declare function potential(queries: SearchRow[], minImpressions?: number): Potential[];
export interface Mover extends SearchRow {
    before: number;
    diff: number;
}
/** Recherches dont les affichages montent (`up`) ou baissent (`down`) par rapport à la période précédente. */
export declare function movers(queries: SearchRow[], previous: SearchRow[], dir: 'up' | 'down'): Mover[];
/** Recherches absentes de la période précédente. */
export declare function newQueries(queries: SearchRow[], previous: SearchRow[]): SearchRow[];
/** Pages très affichées mais peu cliquées. */
export declare const lowCtrPages: (pages: SearchRow[], minImpressions?: number, maxCtr?: number) => SearchRow[];
export interface LostPage extends SearchRow {
    before: number;
}
/** Pages qui avaient des clics sur la période précédente et n'en ont plus. */
export declare function lostPages(pages: SearchRow[], previous: SearchRow[]): LostPage[];
export interface Cannibal {
    key: string;
    pages: number;
    impressions: number;
    clicks: number;
    urls: string[];
}
/** Recherches pour lesquelles plusieurs pages du site s'affichent. */
export declare function cannibalization(rows: QueryPage[]): Cannibal[];
/** Valeurs de la période précédente, par clé. */
export declare const byKey: <T extends {
    key: string;
}>(rows: T[]) => Map<string, T>;
/** Chemin d'une adresse (« https://exemple.org/fr/contact » → « /fr/contact »), l'adresse si elle est illisible. */
export declare function pathOf(url: string): string;
/** Somme de jours YouTube ; durée moyenne vue = minutes ramenées aux vues. */
export declare function sumDays(days: YoutubeDay[]): YoutubeTotals;
/** Les `days` derniers jours d'une série et les `days` d'avant. */
export declare function lastDays(series: YoutubeDay[], days: number): {
    start: string;
    end: string;
    totals: YoutubeTotals;
    previous: YoutubeTotals;
    current: YoutubeDay[];
    before: YoutubeDay[];
};
