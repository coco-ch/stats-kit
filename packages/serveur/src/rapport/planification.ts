/** Planification du rapport hebdomadaire : un envoi par semaine ISO, à partir du jour et de l'heure choisis. */
import { weekId, zonedParts } from '../temps.ts';

export interface WeeklySchedule {
  /** Jour de la semaine, 1 = lundi … 7 = dimanche. */
  weekday: number;
  /** Heure à partir de laquelle envoyer (0 à 23). */
  hour: number;
  timeZone: string;
}

/** Semaine à envoyer maintenant (« 2026-W47 »), ou `null` si ce n'est pas le moment ou si elle est déjà partie. */
export function reportDue(now: number, lastSent: string | null, s: WeeklySchedule): string | null {
  const p = zonedParts(now, s.timeZone);
  const day = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() || 7;
  if (day < s.weekday || (day === s.weekday && p.h < s.hour)) return null;
  const id = weekId(now, s.timeZone);
  return lastSent === id ? null : id;
}

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
      r.log?.(`[stats-kit] rapport ${week} : ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!ok) return 'failed';
    await r.setLastSent(week);
    r.log?.(`[stats-kit] rapport ${week} envoyé`);
    return 'sent';
  };
}

/** Lance la vérification périodique ; renvoie la fonction d'arrêt. */
export function startWeeklyReport(r: WeeklyRunner): () => void {
  const tick = weeklyTick(r);
  const run = () => void tick().catch((e: unknown) => r.log?.(`[stats-kit] ${String(e)}`));
  const first = setTimeout(run, 60_000);
  const timer = setInterval(run, r.intervalMs ?? 600_000);
  first.unref?.();
  timer.unref?.();
  return () => (clearTimeout(first), clearInterval(timer));
}
