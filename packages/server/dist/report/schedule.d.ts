export interface WeeklySchedule {
    /** Weekday, 1 = Monday … 7 = Sunday. */
    weekday: number;
    /** Hour from which to send (0 to 23). */
    hour: number;
    timeZone: string;
}
/** Week to send now ("2026-W47"), or `null` if it is not the time or if it has already been sent. */
export declare function reportDue(now: number, lastSent: string | null, s: WeeklySchedule): string | null;
export interface WeeklyRunner {
    schedule: WeeklySchedule;
    /** Last week sent (stored by the site: database, file…). */
    getLastSent(): Promise<string | null>;
    setLastSent(week: string): Promise<void>;
    /** Sending; `false` or an error: new attempt one hour later. */
    send(): Promise<boolean>;
    /** Check interval (10 minutes by default). */
    intervalMs?: number;
    now?: () => number;
    log?: (message: string) => void;
}
/** One pass: sends if it is time. Returns what happened. */
export declare function weeklyTick(r: WeeklyRunner): () => Promise<'sent' | 'skipped' | 'failed'>;
/** Starts the periodic check; returns the stop function. */
export declare function startWeeklyReport(r: WeeklyRunner): () => void;
