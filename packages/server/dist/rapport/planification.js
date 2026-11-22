/** Planification du rapport hebdomadaire : un envoi par semaine ISO, à partir du jour et de l'heure choisis. */
import { weekId, zonedParts } from "../temps.js";
/** Semaine à envoyer maintenant (« 2026-W47 »), ou `null` si ce n'est pas le moment ou si elle est déjà partie. */
export function reportDue(now, lastSent, s) {
    const p = zonedParts(now, s.timeZone);
    const day = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() || 7;
    if (day < s.weekday || (day === s.weekday && p.h < s.hour))
        return null;
    const id = weekId(now, s.timeZone);
    return lastSent === id ? null : id;
}
/** Un passage : envoie si c'est le moment. Renvoie ce qui s'est passé. */
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
            r.log?.(`[stats-kit] rapport ${week} : ${e instanceof Error ? e.message : String(e)}`);
        }
        if (!ok)
            return 'failed';
        await r.setLastSent(week);
        r.log?.(`[stats-kit] rapport ${week} envoyé`);
        return 'sent';
    };
}
/** Lance la vérification périodique ; renvoie la fonction d'arrêt. */
export function startWeeklyReport(r) {
    const tick = weeklyTick(r);
    const run = () => void tick().catch((e) => r.log?.(`[stats-kit] ${String(e)}`));
    const first = setTimeout(run, 60_000);
    const timer = setInterval(run, r.intervalMs ?? 600_000);
    first.unref?.();
    timer.unref?.();
    return () => (clearTimeout(first), clearInterval(timer));
}
