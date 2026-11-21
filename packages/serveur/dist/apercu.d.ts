import type { Extras, Item, ItemGroup, PageRow, Range, StatsOverview, Unit } from 'stats-kit/contrat';
import { type Expanded, type Point, type UmamiClient } from './umami.ts';
/** Libellés fournis par le site : table, ou fonction (`null` = pas de libellé, la clé s'affiche). */
export type Labels = Record<string, string> | ((key: string) => string | null | undefined);
export declare const labelOf: (labels: Labels | undefined, key: string) => string | null;
/** Réglages des pages du site. */
export interface PagesOptions {
    /** Préfixes de langue (« fr », « en ») : /fr/contact et /en/contact comptent pour /contact ; les chemins sans préfixe sont ignorés. */
    languages?: string[];
    /** Chemins à ignorer (administration, API…). Défaut : /admin et /api. */
    exclude?: RegExp;
    /** Libellés des pages, par chemin logique (« /contact » → « Contact »). */
    labels?: Labels;
    /** Regroupements : la première parenthèse du motif (appliqué au chemin logique) donne la clé. */
    groups?: {
        id: string;
        title: string;
        pattern: RegExp;
        labels?: Labels;
        limit?: number;
    }[];
}
export interface OverviewOptions {
    timeZone: string;
    pages?: PagesOptions;
    /** Libellés des événements suivis. */
    events?: {
        labels?: Labels;
    };
    /** Objectifs : total d'un ou plusieurs événements. */
    goals?: {
        id: string;
        label: string;
        events: string[];
    }[];
    /** Données propres au site (sa base), ajoutées à la réponse ; elles s'affichent même sans Umami. */
    extras?: (range: Range) => Promise<Extras | null>;
    /** Tableau de bord d'Umami. */
    dashboardUrl?: string | null;
    /** Nombre de lignes gardées par classement (30 par défaut). */
    limit?: number;
}
/** Chemin logique d'une adresse : sans requête ni barre finale, sans préfixe de langue ; `null` si elle est ignorée. */
export declare function logicalPath(raw: string, opts?: PagesOptions): {
    page: string;
    lang: string | null;
} | null;
/** Classement simple, avec la période précédente si elle est connue. */
export declare function toItems(points: Point[], previous?: Point[] | null, labels?: Labels, limit?: number): Item[];
/** Regroupe des chemins par page logique (et par langue du site). */
export declare function groupPaths(points: Point[], opts?: PagesOptions): {
    pages: Map<string, number>;
    langs: Map<string, number>;
};
/** Regroupements définis par le site (fiches, articles…), à partir des pages logiques. */
export declare function pageGroups(pages: Map<string, number>, prev: Map<string, number> | null, groups?: PagesOptions['groups']): ItemGroup[];
/** Détail par page logique : vues, visiteurs, entrées, sorties, rebonds, temps, vues de la période précédente. */
export declare function pageRows(path: Expanded[], entry: Expanded[], exit: Expanded[], prev: Point[], opts?: PagesOptions, limit?: number): PageRow[];
/** Série alignée sur des créneaux continus (zéro là où la source n'a rien). */
export declare function alignSeries(slots: string[], points: Point[] | undefined, unit: Unit, timeZone: string): number[];
/** Pages vues par jour de la semaine (lundi = 0) et par heure, à partir de créneaux horaires. */
export declare function heatmap(points: Point[] | undefined, timeZone: string): number[][];
/** Réponse vide (Umami non configuré ou en erreur) : même forme, chiffres à zéro. */
export declare function emptyOverview(range: Range, status: 'not-configured' | 'error', error: string | null, now?: number): StatsOverview;
/** Vue d'ensemble d'une période. `umami` absent : réponse « non configuré » (avec les données du site). */
export declare function buildOverview(umami: UmamiClient | null, range: Range, opts: OverviewOptions, now?: number): Promise<StatsOverview>;
/** Visites arrivées par un lien suivi `utm_source=<source>` et visites venues d'un domaine contenant la source (Umami 3). */
export declare function sourceVisits(umami: UmamiClient, startAt: number, endAt: number, source: string, pages?: PagesOptions): Promise<{
    visitors: number;
    visits: number;
    landing: Item[];
    referred: number | null;
}>;
