/*
 * Analyses calculées à partir des réponses du contrat, côté client : un serveur écrit dans un autre langage n'a pas à les refaire.
 */
import type { QueryPage, SearchRow, YoutubeDay, YoutubeTotals } from './types.ts';

/** Texte sans accents ni majuscules, pour comparer des recherches. */
export const normalize = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Recherche « marque » : elle contient l'un des mots du nom du site. */
export function isBrand(query: string, terms: string[]): boolean {
  const q = normalize(query);
  return terms.some((t) => t.trim() && q.includes(normalize(t.trim())));
}

/** Taux de clic moyen observé en 3e position, base de l'estimation des clics à gagner. */
export const CTR_AT_3 = 0.11;

export interface Potential extends SearchRow {
  /** Clics supplémentaires estimés si la recherche montait en 3e position. */
  gain: number;
}

/** Recherches visibles en position 4 à 20, classées par clics à gagner. */
export function potential(queries: SearchRow[], minImpressions = 10): Potential[] {
  return queries
    .filter((q) => q.position >= 4 && q.position <= 20 && q.impressions >= minImpressions)
    .map((q) => ({ ...q, gain: Math.max(0, Math.round(q.impressions * (CTR_AT_3 - q.ctr))) }))
    .filter((q) => q.gain > 0)
    .sort((a, b) => b.gain - a.gain);
}

export interface Mover extends SearchRow {
  before: number;
  diff: number;
}

/** Recherches dont les affichages montent (`up`) ou baissent (`down`) par rapport à la période précédente. */
export function movers(queries: SearchRow[], previous: SearchRow[], dir: 'up' | 'down'): Mover[] {
  const before = new Map(previous.map((p) => [p.key, p.impressions]));
  const now = new Map(queries.map((q) => [q.key, q]));
  const keys = new Set([...now.keys(), ...(dir === 'down' ? before.keys() : [])]);
  const out: Mover[] = [];
  for (const k of keys) {
    const b = before.get(k);
    if (b === undefined) continue; // nouvelle recherche : listée à part
    const q = now.get(k) ?? { key: k, clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const diff = q.impressions - b;
    if ((dir === 'up' && diff > 0) || (dir === 'down' && diff < 0)) out.push({ ...q, before: b, diff });
  }
  return out.sort((a, b) => (dir === 'up' ? b.diff - a.diff : a.diff - b.diff));
}

/** Recherches absentes de la période précédente. */
export function newQueries(queries: SearchRow[], previous: SearchRow[]): SearchRow[] {
  const before = new Set(previous.map((p) => p.key));
  return queries.filter((q) => !before.has(q.key) && q.impressions > 0).sort((a, b) => b.impressions - a.impressions);
}

/** Pages très affichées mais peu cliquées. */
export const lowCtrPages = (pages: SearchRow[], minImpressions = 20, maxCtr = 0.02): SearchRow[] =>
  pages.filter((p) => p.impressions >= minImpressions && p.ctr < maxCtr).sort((a, b) => b.impressions - a.impressions);

export interface LostPage extends SearchRow {
  before: number;
}

/** Pages qui avaient des clics sur la période précédente et n'en ont plus. */
export function lostPages(pages: SearchRow[], previous: SearchRow[]): LostPage[] {
  const now = new Map(pages.map((p) => [p.key, p]));
  return previous
    .filter((p) => p.clicks > 0 && !(now.get(p.key)?.clicks ?? 0))
    .map((p) => ({ ...(now.get(p.key) ?? { key: p.key, clicks: 0, impressions: 0, ctr: 0, position: 0 }), before: p.clicks }))
    .sort((a, b) => b.before - a.before);
}

export interface Cannibal {
  key: string;
  pages: number;
  impressions: number;
  clicks: number;
  urls: string[];
}

/** Recherches pour lesquelles plusieurs pages du site s'affichent. */
export function cannibalization(rows: QueryPage[]): Cannibal[] {
  const by = new Map<string, QueryPage[]>();
  for (const r of rows) if (r.impressions > 0) by.set(r.query, [...(by.get(r.query) ?? []), r]);
  return [...by]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({
      key,
      pages: list.length,
      impressions: list.reduce((n, r) => n + r.impressions, 0),
      clicks: list.reduce((n, r) => n + r.clicks, 0),
      urls: list.map((r) => r.page),
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

/** Valeurs de la période précédente, par clé. */
export const byKey = <T extends { key: string }>(rows: T[]): Map<string, T> => new Map(rows.map((r) => [r.key, r]));

/** Chemin d'une adresse (« https://exemple.org/fr/contact » → « /fr/contact »), l'adresse si elle est illisible. */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

/** Somme de jours YouTube ; durée moyenne vue = minutes ramenées aux vues. */
export function sumDays(days: YoutubeDay[]): YoutubeTotals {
  const t = days.reduce((a, d) => ({ views: a.views + d.views, minutes: a.minutes + d.minutes, gained: a.gained + d.gained, lost: a.lost + d.lost }), { views: 0, minutes: 0, gained: 0, lost: 0 });
  return { ...t, averageViewDuration: t.views ? Math.round((t.minutes * 60) / t.views) : 0 };
}

/** Les `days` derniers jours d'une série et les `days` d'avant. */
export function lastDays(series: YoutubeDay[], days: number): { start: string; end: string; totals: YoutubeTotals; previous: YoutubeTotals; current: YoutubeDay[]; before: YoutubeDay[] } {
  const current = series.slice(-days);
  const before = series.slice(-2 * days, -days);
  return { start: current[0]?.date ?? '', end: current.at(-1)?.date ?? '', totals: sumDays(current), previous: sumDays(before), current, before };
}
