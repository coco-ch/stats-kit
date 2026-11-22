import type { Range, Unit } from 'stats-kit/contrat';
export declare const HOUR = 3600000;
export declare const DAY = 86400000;
/** Heure murale d'un instant dans un fuseau. */
export declare function zonedParts(ms: number, timeZone: string): {
    y: number;
    m: number;
    d: number;
    h: number;
    mi: number;
    s: number;
};
/** Décalage du fuseau à cet instant, en millisecondes (heure murale − UTC). */
export declare function offsetAt(ms: number, timeZone: string): number;
/** Instant d'une heure murale dans un fuseau (heure d'été comprise). */
export declare function zonedToInstant(y: number, m: number, d: number, h: number, timeZone: string): number;
/** Créneau d'un instant : « AAAA-MM-JJ » (jour) ou « AAAA-MM-JJTHH » (heure), dans le fuseau. */
export declare function slotOf(ms: number, unit: Unit, timeZone: string): string;
/** Tous les créneaux de [from, to[, dans l'ordre, sans trou. */
export declare function slotsBetween(from: number, to: number, unit: Unit, timeZone: string): string[];
/**
 * Créneau d'une date renvoyée par une source : un instant (« …Z », « …+01:00 ») est ramené dans le fuseau ; une heure murale
 * (« 2026-11-16 14:00:00 », déjà dans le fuseau demandé à la source) est lue telle quelle.
 */
export declare function slotOfLabel(x: string, unit: Unit, timeZone: string): string;
/** Paramètres de période reçus dans l'adresse. */
export interface RangeQuery {
    days?: unknown;
    from?: unknown;
    to?: unknown;
}
/**
 * Période demandée : `days` (1 = dernières 24 heures, 7, 30, 90… jusqu'à 366 ; 30 par défaut) ou `from` / `to` (AAAA-MM-JJ, jours
 * inclus, lus dans le fuseau, au plus 366 jours). La période précédente a la même durée et se termine où commence la période.
 */
export declare function resolveRange(q: RangeQuery, timeZone: string, now?: number, defaultDays?: number): Range;
/** Jour « AAAA-MM-JJ » (UTC) d'un instant. */
export declare const ymd: (ms: number) => string;
/** Identifiant de semaine ISO (« 2026-W47 ») d'un instant, calculé sur la date du fuseau. */
export declare function weekId(ms: number, timeZone: string): string;
