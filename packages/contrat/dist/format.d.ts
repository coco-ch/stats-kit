import { type Texts } from './textes.ts';
/** Évolution affichable : texte (« ▲ +12 % ») et sens (`up` = bonne nouvelle, `down` = mauvaise). */
export interface Delta {
    text: string;
    tone: 'up' | 'down' | 'flat' | '';
}
/** Évolution relative ; `lowerIsBetter` pour une position (un chiffre plus petit est meilleur). */
export declare function delta(texts: Texts, now: number, before: number | null | undefined, lowerIsBetter?: boolean): Delta;
/** Écart absolu (positions, points de pourcentage). */
export declare function gap(texts: Texts, now: number, before: number | null | undefined, lowerIsBetter: boolean, digits?: number, unit?: string): Delta;
/** Évolution en pourcentage entier, ou `null` sans base de comparaison (rapport). */
export declare const percentChange: (now: number, before: number | null | undefined) => number | null;
/** Taux (0 à 1) en pourcentage : « 12,5 % ». */
export declare const formatPercent: (texts: Texts, v: number, digits?: number) => string;
/** Durée en secondes : « 2 min 05 s », « 42 s », « — » si nulle. */
export declare function formatDuration(sec: number): string;
/** Courbe compacte (chemin SVG d'une boîte w × h) ; vide s'il y a moins de deux points ou aucune variation. */
export declare function sparkPath(values: number[], w?: number, h?: number): string;
/** Pas de graduation rond (1, 2 ou 5 × 10ⁿ) pour `parts` intervalles au plus. */
export declare function niceStep(max: number, parts?: number): number;
/** Créneau « AAAA-MM-JJ » ou « AAAA-MM-JJTHH » → date UTC qui porte ces chiffres (pour l'afficher sans décalage de fuseau). */
export declare function slotDate(slot: string): Date;
/** Jour de la semaine d'un créneau, lundi = 0. */
export declare const weekdayOf: (slot: string) => number;
/** Libellé d'un créneau : « 14 h » (heure), « 16 nov. » (court) ou « lun. 16 nov. » (long). */
export declare function slotLabel(texts: Texts, slot: string, unit: 'day' | 'hour', long?: boolean): string;
/** Jour « AAAA-MM-JJ » en toutes lettres : « lundi 16 novembre ». */
export declare const longDay: (texts: Texts, ymd: string) => string;
/** Jour « AAAA-MM-JJ » ou instant ISO, en court : « 16 nov. 2026 » ; l'instant est lu dans `timeZone`. */
export declare function shortDate(texts: Texts, value: string, timeZone?: string, withYear?: boolean): string;
/** Meilleur créneau d'une carte de chaleur 7 × 24, ou `null` si elle est vide. */
export declare function bestSlot(grid: number[][] | null | undefined): {
    day: number;
    hour: number;
    value: number;
} | null;
/** Nom d'un pays (code ISO alpha-2 ou alpha-3) dans la langue des textes, avec repli sur le code. */
export declare function countryName(texts: Texts, code: string): string;
/** Nom d'une langue (« fr » → « français »), avec repli sur le code. */
export declare const languageName: (texts: Texts, code: string) => string;
/** Région « FR-PAC » → « PAC (France) ». */
export declare function regionName(texts: Texts, code: string): string;
/** Drapeau (emoji) d'un code pays alpha-2 ; globe sinon. */
export declare const flag: (code: string | null | undefined) => string;
/** Majuscule initiale (navigateurs et systèmes arrivent en minuscules). */
export declare const capitalize: (s: string) => string;
/** Libellé d'un appareil Umami. */
export declare const deviceName: (texts: Texts, code: string) => string;
/** Nom d'un navigateur tel qu'Umami le code (« edge-chromium » → « Edge »). */
export declare const browserName: (code: string) => string;
/** Libellé d'un canal d'acquisition Umami. */
export declare const channelName: (texts: Texts, code: string) => string;
/** Texte de la période : « du 1 nov. au 30 nov. (30 jours) » ou « 24 dernières heures ». */
export declare function rangeText(texts: Texts, range: {
    from: string;
    to: string;
    days: number;
    timeZone: string;
}): string;
/** CSV (séparateur « ; », guillemets, BOM pour Excel). */
export declare function toCsv(rows: (string | number | null | undefined)[][]): string;
/** Nom de fichier sûr à partir d'un titre. */
export declare const fileName: (title: string) => string;
