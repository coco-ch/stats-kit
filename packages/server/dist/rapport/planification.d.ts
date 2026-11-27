export interface WeeklySchedule {
    /** Jour de la semaine, 1 = lundi … 7 = dimanche. */
    weekday: number;
    /** Heure à partir de laquelle envoyer (0 à 23). */
    hour: number;
    timeZone: string;
}
/** Semaine à envoyer maintenant (« 2026-W47 »), ou `null` si ce n'est pas le moment ou si elle est déjà partie. */
export declare function reportDue(now: number, lastSent: string | null, s: WeeklySchedule): string | null;
export interface WeeklyRunner {
    schedule: WeeklySchedule;
    /** Dernière semaine envoyée (stockée par le site : base, fichier…). */
    getLastSent(): Promise<string | null>;
    setLastSent(week: string): Promise<void>;
    /** Envoi ; `false` ou une erreur : nouvel essai une heure plus tard. */
    send(): Promise<boolean>;
    /** Intervalle de vérification (10 minutes par défaut). */
    intervalMs?: number;
    now?: () => number;
    log?: (message: string) => void;
}
/** Un passage : envoie si c'est le moment. Renvoie ce qui s'est passé. */
export declare function weeklyTick(r: WeeklyRunner): () => Promise<'sent' | 'skipped' | 'failed'>;
/** Lance la vérification périodique ; renvoie la fonction d'arrêt. */
export declare function startWeeklyReport(r: WeeklyRunner): () => void;
