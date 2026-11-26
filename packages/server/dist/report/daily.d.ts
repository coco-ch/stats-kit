import type { StatsOverview } from 'stats-kit/contract';
import { type UmamiClient } from '../umami.ts';
/** Day by day, aligned on `overview.series.slots`. */
export interface ReportDaily {
    visits: number[];
    bounces: number[];
}
/** Visits and bounces of each day of the period; `null` if the period is not counted by day, too long, or if Umami refuses one day. */
export declare function dailyVisits(umami: UmamiClient, o: StatsOverview): Promise<ReportDaily | null>;
/** Occurrences of each goal per slot (sum of its events), from `overview.eventSeries`; a goal without data is left out. */
export declare function goalSeries(o: StatsOverview, goals: {
    id: string;
    events: string[];
}[]): Record<string, number[]>;
