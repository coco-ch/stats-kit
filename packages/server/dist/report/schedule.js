/** Scheduling of the weekly report: one sending per ISO week, from the chosen day and hour. */
import { weekId, zonedParts } from "../time.js";
/** Week to send now ("2026-W47"), or `null` if it is not the time or if it has already been sent. */
export function reportDue(now, lastSent, s) {
    const p = zonedParts(now, s.timeZone);
    const day = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() || 7;
    if (day < s.weekday || (day === s.weekday && p.h < s.hour))
        return null;
    if (day - s.weekday >= Math.max(1, s.catchUpDays ?? 3))
        return null;
    const id = weekId(now, s.timeZone);
    return lastSent === id ? null : id;
}
/** One pass: sends if it is time. Returns what happened. */
export function weeklyTick(r) {
    let lastAttempt = -Infinity;
    return async () => {
        const now = (r.now ?? Date.now)();
        const week = reportDue(now, await r.getLastSent(), r.schedule);
        if (!week || now - lastAttempt < 3_600_000)
            return 'skipped';
        lastAttempt = now;
        let ok = false;
        try {
            ok = await r.send();
        }
        catch (e) {
            r.log?.(`[stats-kit] report ${week}: ${e instanceof Error ? e.message : String(e)}`);
        }
        if (!ok)
            return 'failed';
        await r.setLastSent(week);
        r.log?.(`[stats-kit] report ${week} sent`);
        return 'sent';
    };
}
/** Starts the periodic check; returns the stop function. */
export function startWeeklyReport(r) {
    const tick = weeklyTick(r);
    const run = () => void tick().catch((e) => r.log?.(`[stats-kit] ${String(e)}`));
    const first = setTimeout(run, 60_000);
    const timer = setInterval(run, r.intervalMs ?? 600_000);
    first.unref?.();
    timer.unref?.();
    return () => (clearTimeout(first), clearInterval(timer));
}
