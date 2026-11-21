/** Scheduling of the weekly report: one sending per ISO week, from the chosen day and hour. */
import { weekId, zonedParts } from '../time.ts';

export interface WeeklySchedule {
  /** Weekday, 1 = Monday … 7 = Sunday. */
  weekday: number;
  /** Hour from which to send (0 to 23). */
  hour: number;
  timeZone: string;
}

/** Week to send now ("2026-W47"), or `null` if it is not the time or if it has already been sent. */
export function reportDue(now: number, lastSent: string | null, s: WeeklySchedule): string | null {
  const p = zonedParts(now, s.timeZone);
  const day = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() || 7;
  if (day < s.weekday || (day === s.weekday && p.h < s.hour)) return null;
  const id = weekId(now, s.timeZone);
  return lastSent === id ? null : id;
}

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
export function weeklyTick(r: WeeklyRunner): () => Promise<'sent' | 'skipped' | 'failed'> {
  let lastAttempt = -Infinity;
  return async () => {
    const now = (r.now ?? Date.now)();
    const week = reportDue(now, await r.getLastSent(), r.schedule);
    if (!week || now - lastAttempt < 3_600_000) return 'skipped';
    lastAttempt = now;
    let ok = false;
    try {
      ok = await r.send();
    } catch (e) {
      r.log?.(`[stats-kit] report ${week}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!ok) return 'failed';
    await r.setLastSent(week);
    r.log?.(`[stats-kit] report ${week} sent`);
    return 'sent';
  };
}

/** Starts the periodic check; returns the stop function. */
export function startWeeklyReport(r: WeeklyRunner): () => void {
  const tick = weeklyTick(r);
  const run = () => void tick().catch((e: unknown) => r.log?.(`[stats-kit] ${String(e)}`));
  const first = setTimeout(run, 60_000);
  const timer = setInterval(run, r.intervalMs ?? 600_000);
  first.unref?.();
  timer.unref?.();
  return () => (clearTimeout(first), clearInterval(timer));
}
