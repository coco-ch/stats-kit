export const HOUR = 3_600_000;
export const DAY = 86_400_000;
const formatters = new Map();
const formatter = (timeZone) => {
    let f = formatters.get(timeZone);
    if (!f) {
        f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
        formatters.set(timeZone, f);
    }
    return f;
};
/** Heure murale d'un instant dans un fuseau. */
export function zonedParts(ms, timeZone) {
    const p = {};
    for (const part of formatter(timeZone).formatToParts(new Date(ms)))
        if (part.type !== 'literal')
            p[part.type] = Number(part.value);
    return { y: p['year'], m: p['month'], d: p['day'], h: p['hour'] % 24, mi: p['minute'], s: p['second'] };
}
/** Décalage du fuseau à cet instant, en millisecondes (heure murale − UTC). */
export function offsetAt(ms, timeZone) {
    const p = zonedParts(ms, timeZone);
    return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}
/** Instant d'une heure murale dans un fuseau (heure d'été comprise). */
export function zonedToInstant(y, m, d, h, timeZone) {
    const wall = Date.UTC(y, m - 1, d, h);
    const first = wall - offsetAt(wall, timeZone);
    return wall - offsetAt(first, timeZone);
}
const pad = (n) => String(n).padStart(2, '0');
/** Créneau d'un instant : « AAAA-MM-JJ » (jour) ou « AAAA-MM-JJTHH » (heure), dans le fuseau. */
export function slotOf(ms, unit, timeZone) {
    const p = zonedParts(ms, timeZone);
    const day = `${p.y}-${pad(p.m)}-${pad(p.d)}`;
    return unit === 'day' ? day : `${day}T${pad(p.h)}`;
}
/** Tous les créneaux de [from, to[, dans l'ordre, sans trou. */
export function slotsBetween(from, to, unit, timeZone) {
    const out = [];
    const start = Math.floor(from / HOUR) * HOUR;
    for (let t = start; t < to; t += HOUR) {
        const key = slotOf(t, unit, timeZone);
        if (out.at(-1) !== key)
            out.push(key);
    }
    return out;
}
/**
 * Créneau d'une date renvoyée par une source : un instant (« …Z », « …+01:00 ») est ramené dans le fuseau ; une heure murale
 * (« 2026-11-16 14:00:00 », déjà dans le fuseau demandé à la source) est lue telle quelle.
 */
export function slotOfLabel(x, unit, timeZone) {
    if (/(Z|[+-]\d{2}:?\d{2})$/.test(x)) {
        const t = Date.parse(x);
        if (Number.isFinite(t))
            return slotOf(t, unit, timeZone);
    }
    const day = x.slice(0, 10);
    return unit === 'day' ? day : `${day}T${x.slice(11, 13) || '00'}`;
}
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
/**
 * Période demandée : `days` (1 = dernières 24 heures, 7, 30, 90… jusqu'à 366 ; 30 par défaut) ou `from` / `to` (AAAA-MM-JJ, jours
 * inclus, lus dans le fuseau, au plus 366 jours). La période précédente a la même durée et se termine où commence la période.
 */
export function resolveRange(q, timeZone, now = Date.now(), defaultDays = 30) {
    let from = null;
    let to = now;
    const f = typeof q.from === 'string' ? YMD.exec(q.from) : null;
    if (f) {
        const t = typeof q.to === 'string' ? YMD.exec(q.to) : null;
        const start = zonedToInstant(+f[1], +f[2], +f[3], 0, timeZone);
        const endDay = t ? Date.UTC(+t[1], +t[2] - 1, +t[3]) + DAY : null;
        const end = endDay === null ? now : Math.min(now, zonedToInstant(new Date(endDay).getUTCFullYear(), new Date(endDay).getUTCMonth() + 1, new Date(endDay).getUTCDate(), 0, timeZone));
        if (end > start && end - start <= 366 * DAY) {
            from = start;
            to = end;
        }
    }
    if (from === null) {
        const asked = Math.floor(Number(q.days));
        const days = Number.isFinite(asked) && asked >= 1 ? Math.min(asked, 366) : defaultDays;
        from = now - days * DAY;
        to = now;
    }
    const days = Math.max(1, Math.round((to - from) / DAY));
    const iso = (ms) => new Date(ms).toISOString();
    return { from: iso(from), to: iso(to), days, unit: to - from <= DAY ? 'hour' : 'day', timeZone, previousFrom: iso(from - (to - from)), previousTo: iso(from) };
}
/** Jour « AAAA-MM-JJ » (UTC) d'un instant. */
export const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
/** Identifiant de semaine ISO (« 2026-W47 ») d'un instant, calculé sur la date du fuseau. */
export function weekId(ms, timeZone) {
    const { y, m, d } = zonedParts(ms, timeZone);
    const t = new Date(Date.UTC(y, m - 1, d));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const week = Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
    return `${t.getUTCFullYear()}-W${pad(week)}`;
}
