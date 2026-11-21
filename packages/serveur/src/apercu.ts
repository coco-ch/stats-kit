/*
 * Vue d'ensemble de la fréquentation (réponse `StatsOverview`) : interroge Umami en parallèle, regroupe les pages, aligne les
 * séries sur des créneaux continus, compare à la période précédente et ajoute les données propres au site.
 */
import type { Breakdowns, Extras, Goal, Item, ItemGroup, PageRow, Range, Series, Session, StatsOverview, Totals, Unit } from 'stats-kit/contrat';
import { errorMessage, settle } from './http.ts';
import { parseStats, type Expanded, type Point, type UmamiClient, type UmamiSession } from './umami.ts';
import { DAY, slotOfLabel, slotsBetween } from './temps.ts';

/** Libellés fournis par le site : table, ou fonction (`null` = pas de libellé, la clé s'affiche). */
export type Labels = Record<string, string> | ((key: string) => string | null | undefined);

export const labelOf = (labels: Labels | undefined, key: string): string | null =>
  !labels ? null : typeof labels === 'function' ? (labels(key) ?? null) : (labels[key] ?? null);

/** Réglages des pages du site. */
export interface PagesOptions {
  /** Préfixes de langue (« fr », « en ») : /fr/contact et /en/contact comptent pour /contact ; les chemins sans préfixe sont ignorés. */
  languages?: string[];
  /** Chemins à ignorer (administration, API…). Défaut : /admin et /api. */
  exclude?: RegExp;
  /** Libellés des pages, par chemin logique (« /contact » → « Contact »). */
  labels?: Labels;
  /** Regroupements : la première parenthèse du motif (appliqué au chemin logique) donne la clé. */
  groups?: { id: string; title: string; pattern: RegExp; labels?: Labels; limit?: number }[];
}

export interface OverviewOptions {
  timeZone: string;
  pages?: PagesOptions;
  /** Libellés des événements suivis. */
  events?: { labels?: Labels };
  /** Objectifs : total d'un ou plusieurs événements. */
  goals?: { id: string; label: string; events: string[] }[];
  /** Données propres au site (sa base), ajoutées à la réponse ; elles s'affichent même sans Umami. */
  extras?: (range: Range) => Promise<Extras | null>;
  /** Tableau de bord d'Umami. */
  dashboardUrl?: string | null;
  /** Nombre de lignes gardées par classement (30 par défaut). */
  limit?: number;
}

const ZERO: Totals = { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 };
const DEFAULT_EXCLUDE = /^\/(admin|api)(\/|$)/;

/** Chemin logique d'une adresse : sans requête ni barre finale, sans préfixe de langue ; `null` si elle est ignorée. */
export function logicalPath(raw: string, opts: PagesOptions = {}): { page: string; lang: string | null } | null {
  const path = (raw.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/';
  if ((opts.exclude ?? DEFAULT_EXCLUDE).test(path)) return null;
  if (!opts.languages?.length) return { page: path, lang: null };
  const m = new RegExp(`^/(${opts.languages.map((l) => l.replace(/[^a-z0-9-]/gi, '')).join('|')})(/.*)?$`).exec(path);
  return m ? { page: m[2] || '/', lang: m[1] } : null;
}

const sortItems = (items: Item[]) => items.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
const add = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n);

/** Classement simple, avec la période précédente si elle est connue. */
export function toItems(points: Point[], previous: Point[] | null = null, labels?: Labels, limit = 30): Item[] {
  const prev = previous ? new Map<string, number>() : null;
  for (const p of previous ?? []) add(prev!, p.x ?? '', p.y);
  const cur = new Map<string, number>();
  for (const p of points) add(cur, p.x ?? '', p.y);
  return sortItems([...cur].map(([key, value]) => ({ key, label: labelOf(labels, key), value, previous: prev ? (prev.get(key) ?? 0) : null }))).slice(0, limit);
}

/** Regroupe des chemins par page logique (et par langue du site). */
export function groupPaths(points: Point[], opts: PagesOptions = {}): { pages: Map<string, number>; langs: Map<string, number> } {
  const pages = new Map<string, number>();
  const langs = new Map<string, number>();
  for (const { x, y } of points) {
    const l = logicalPath(x ?? '', opts);
    if (!l) continue;
    add(pages, l.page, y);
    if (l.lang) add(langs, l.lang, y);
  }
  return { pages, langs };
}

const mapItems = (m: Map<string, number>, prev: Map<string, number> | null, labels: Labels | undefined, limit: number): Item[] =>
  sortItems([...m].map(([key, value]) => ({ key, label: labelOf(labels, key), value, previous: prev ? (prev.get(key) ?? 0) : null }))).slice(0, limit);

/** Regroupements définis par le site (fiches, articles…), à partir des pages logiques. */
export function pageGroups(pages: Map<string, number>, prev: Map<string, number> | null, groups: PagesOptions['groups'] = []): ItemGroup[] {
  return groups.map((g) => {
    const cur = new Map<string, number>();
    const before = prev ? new Map<string, number>() : null;
    for (const [page, n] of pages) { const m = g.pattern.exec(page); if (m) add(cur, m[1] ?? page, n); }
    for (const [page, n] of prev ?? []) { const m = g.pattern.exec(page); if (m) add(before!, m[1] ?? page, n); }
    return { id: g.id, title: g.title, items: mapItems(cur, before, g.labels, g.limit ?? 15) };
  });
}

/** Détail par page logique : vues, visiteurs, entrées, sorties, rebonds, temps, vues de la période précédente. */
export function pageRows(path: Expanded[], entry: Expanded[], exit: Expanded[], prev: Point[], opts: PagesOptions = {}, limit = 60): PageRow[] {
  const rows = new Map<string, PageRow>();
  const row = (k: string) => {
    let r = rows.get(k);
    if (!r) rows.set(k, (r = { key: k, label: labelOf(opts.labels, k), views: 0, visitors: 0, entries: 0, exits: 0, bounces: 0, totaltime: 0, previousViews: 0 }));
    return r;
  };
  for (const e of path) { const l = logicalPath(e.name, opts); if (l) { const r = row(l.page); r.views += Number(e.pageviews) || 0; r.visitors += e.visitors; r.totaltime += e.totaltime; } }
  for (const e of entry) { const l = logicalPath(e.name, opts); if (l) { const r = row(l.page); r.entries += e.visits; r.bounces += e.bounces; } }
  for (const e of exit) { const l = logicalPath(e.name, opts); if (l) row(l.page).exits += e.visits; }
  for (const e of prev) { const l = logicalPath(e.x, opts); const r = l && rows.get(l.page); if (r) r.previousViews = (r.previousViews ?? 0) + e.y; }
  return [...rows.values()].sort((a, b) => b.views - a.views || a.key.localeCompare(b.key)).slice(0, limit);
}

/** Série alignée sur des créneaux continus (zéro là où la source n'a rien). */
export function alignSeries(slots: string[], points: Point[] | undefined, unit: Unit, timeZone: string): number[] {
  const m = new Map<string, number>();
  for (const p of points ?? []) add(m, slotOfLabel(p.x, unit, timeZone), p.y);
  return slots.map((s) => m.get(s) ?? 0);
}

/** Pages vues par jour de la semaine (lundi = 0) et par heure, à partir de créneaux horaires. */
export function heatmap(points: Point[] | undefined, timeZone: string): number[][] {
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const p of points ?? []) {
    const slot = slotOfLabel(p.x, 'hour', timeZone);
    const day = (new Date(Date.UTC(+slot.slice(0, 4), +slot.slice(5, 7) - 1, +slot.slice(8, 10))).getUTCDay() + 6) % 7;
    const hour = +slot.slice(11, 13);
    if (Number.isInteger(day) && hour >= 0 && hour < 24) grid[day][hour] += p.y;
  }
  return grid;
}

const session = (s: UmamiSession): Session => ({
  country: s.country || null, city: s.city || null, device: s.device || null, browser: s.browser || null, os: s.os || null,
  views: Number(s.views ?? 0), lastAt: s.lastAt ?? s.createdAt ?? null,
});

const emptyBreakdowns = (): Breakdowns => ({
  pages: [], entries: [], exits: [], referrers: [], channels: [], countries: [], regions: [], cities: [], languages: [], siteLanguages: [],
  devices: [], browsers: [], os: [], screens: [], events: [], hostnames: [], utmSources: [], utmMediums: [], utmCampaigns: [],
});

const emptySeries = (slots: string[], unit: Unit): Series => ({ unit, slots, pageviews: slots.map(() => 0), visitors: slots.map(() => 0), previousPageviews: null });

/** Réponse vide (Umami non configuré ou en erreur) : même forme, chiffres à zéro. */
export function emptyOverview(range: Range, status: 'not-configured' | 'error', error: string | null, now = Date.now()): StatsOverview {
  const from = Date.parse(range.from), to = Date.parse(range.to);
  return {
    version: 1, status, error, generatedAt: new Date(now).toISOString(), range, totals: { ...ZERO }, previous: null, active: null,
    series: emptySeries(slotsBetween(from, to, range.unit, range.timeZone), range.unit),
    last24h: emptySeries(slotsBetween(now - DAY, now, 'hour', range.timeZone), 'hour'),
    heatmap: heatmap([], range.timeZone), breakdowns: emptyBreakdowns(), pages: [], groups: [], goals: [], counts: { countries: null, events: null },
    sessions: [], extras: null, dashboardUrl: null,
  };
}

/** Extras du site, sans jamais faire échouer la réponse. */
async function siteExtras(opts: OverviewOptions, range: Range): Promise<Extras | null> {
  if (!opts.extras) return null;
  try {
    return await opts.extras(range);
  } catch (e) {
    console.error('[stats-kit] données du site indisponibles :', errorMessage(e));
    return null;
  }
}

/** Vue d'ensemble d'une période. `umami` absent : réponse « non configuré » (avec les données du site). */
export async function buildOverview(umami: UmamiClient | null, range: Range, opts: OverviewOptions, now = Date.now()): Promise<StatsOverview> {
  const extrasP = siteExtras(opts, range);
  if (!umami) return { ...emptyOverview(range, 'not-configured', null, now), extras: await extrasP };
  const tz = range.timeZone;
  const from = Date.parse(range.from), to = Date.parse(range.to);
  const pFrom = Date.parse(range.previousFrom), pTo = Date.parse(range.previousTo);
  const unit = range.unit;
  const limit = opts.limit ?? 30;
  const q = { startAt: from, endAt: to };
  const pq = { startAt: pFrom, endAt: pTo };
  const none: Point[] = [];
  const m = (type: string, n = limit, a = from, b = to) => settle(umami.metric(type, a, b, n), none);
  const pv = (a: number, b: number, u: Unit) => settle(umami.get<{ pageviews?: Point[]; sessions?: Point[] }>('pageviews', { startAt: a, endAt: b, unit: u, timezone: tz }), {});
  const expanded = (type: string) => settle(umami.get<Expanded[]>('metrics/expanded', { ...q, type, limit: 500 }), [] as Expanded[]);

  let stats: Record<string, unknown>;
  try {
    stats = await umami.get<Record<string, unknown>>('stats', q);
  } catch (e) {
    return { ...emptyOverview(range, 'error', errorMessage(e), now), extras: await extrasP };
  }

  const [prevStats, active, series, prevSeries, last24, hourly, paths, prevPaths, entries, exits, referrers, prevReferrers, channels, prevChannels,
    countries, prevCountries, regions, cities, languages, devices, browsers, os, screens, events, prevEvents, hostnames, utmS, utmM, utmC,
    pathX, entryX, exitX, sessions, sessionStats] = await Promise.all([
    settle(umami.get<Record<string, unknown>>('stats', pq), null),
    settle(umami.get<{ visitors?: number; x?: number }>('active').then((a) => a.visitors ?? a.x ?? 0), null),
    pv(from, to, unit), pv(pFrom, pTo, unit), pv(now - DAY, now, 'hour'), unit === 'hour' ? Promise.resolve(null) : pv(from, to, 'hour'),
    m('path', 500), m('path', 500, pFrom, pTo), m('entry', 500), m('exit', 500), m('referrer'), m('referrer', limit, pFrom, pTo),
    m('channel'), m('channel', limit, pFrom, pTo), m('country'), m('country', limit, pFrom, pTo), m('region'), m('city'), m('language', 15),
    m('device'), m('browser', 12), m('os', 12), m('screen', 12), m('event', 50), m('event', 50, pFrom, pTo), m('hostname'),
    m('utmSource'), m('utmMedium'), m('utmCampaign'),
    expanded('path'), expanded('entry'), expanded('exit'),
    settle(umami.get<{ data?: UmamiSession[] }>('sessions', { ...q, pageSize: 12, page: 1 }), {} as { data?: UmamiSession[] }),
    settle(umami.get<Record<string, { value?: number }>>('sessions/stats', q), {} as Record<string, { value?: number }>),
  ]);

  const pages = opts.pages ?? {};
  const cur = groupPaths(paths, pages);
  const before = groupPaths(prevPaths, pages);
  const slots = slotsBetween(from, to, unit, tz);
  const prevSlots = slotsBetween(pFrom, pTo, unit, tz);
  const prevValues = alignSeries(prevSlots, prevSeries.pageviews, unit, tz);
  const s24 = slotsBetween(now - DAY, now, 'hour', tz);
  const eventLabels = opts.events?.labels;
  const goalSum = (pts: Point[], names: string[]) => pts.filter((p) => names.includes(p.x)).reduce((n, p) => n + p.y, 0);
  const goals: Goal[] = (opts.goals ?? []).map((g) => ({ id: g.id, label: g.label, value: goalSum(events, g.events), previous: goalSum(prevEvents, g.events) }));
  const prevStatsParsed = prevStats ? parseStats(prevStats) : null;

  return {
    version: 1,
    status: 'ok',
    error: null,
    generatedAt: new Date(now).toISOString(),
    range,
    totals: parseStats(stats),
    previous: prevStatsParsed,
    active,
    series: {
      unit, slots,
      pageviews: alignSeries(slots, series.pageviews, unit, tz),
      visitors: alignSeries(slots, series.sessions, unit, tz),
      previousPageviews: prevSeries.pageviews ? slots.map((_, i) => prevValues[i] ?? 0) : null,
    },
    last24h: { unit: 'hour', slots: s24, pageviews: alignSeries(s24, last24.pageviews, 'hour', tz), visitors: alignSeries(s24, last24.sessions, 'hour', tz), previousPageviews: null },
    heatmap: heatmap((hourly ?? series).pageviews, tz),
    breakdowns: {
      pages: mapItems(cur.pages, before.pages, pages.labels, limit),
      entries: mapItems(groupPaths(entries, pages).pages, null, pages.labels, limit),
      exits: mapItems(groupPaths(exits, pages).pages, null, pages.labels, limit),
      referrers: toItems(referrers, prevReferrers, undefined, limit),
      channels: toItems(channels, prevChannels, undefined, limit),
      countries: toItems(countries, prevCountries, undefined, limit),
      regions: toItems(regions, null, undefined, limit),
      cities: toItems(cities, null, undefined, limit),
      languages: toItems(languages, null, undefined, limit),
      siteLanguages: mapItems(cur.langs, before.langs, undefined, limit),
      devices: toItems(devices, null, undefined, limit),
      browsers: toItems(browsers, null, undefined, limit),
      os: toItems(os, null, undefined, limit),
      screens: toItems(screens, null, undefined, limit),
      events: toItems(events, prevEvents, eventLabels, 50),
      hostnames: toItems(hostnames, null, undefined, limit),
      utmSources: toItems(utmS, null, undefined, limit),
      utmMediums: toItems(utmM, null, undefined, limit),
      utmCampaigns: toItems(utmC, null, undefined, limit),
    },
    pages: pageRows(pathX, entryX, exitX, prevPaths, pages),
    groups: pageGroups(cur.pages, before.pages, pages.groups),
    goals,
    counts: { countries: sessionStats['countries']?.value ?? null, events: sessionStats['events']?.value ?? null },
    sessions: (sessions.data ?? []).map(session),
    extras: await extrasP,
    dashboardUrl: opts.dashboardUrl ?? null,
  };
}

/** Visites arrivées par un lien suivi `utm_source=<source>` et visites venues d'un domaine contenant la source (Umami 3). */
export async function sourceVisits(umami: UmamiClient, startAt: number, endAt: number, source: string, pages: PagesOptions = {}) {
  const tagged = { startAt, endAt, query: `c.utm_source=${source}` };
  const [stats, paths, referred] = await Promise.all([
    umami.get<Record<string, unknown>>('stats', tagged),
    settle(umami.get<Point[]>('metrics', { ...tagged, type: 'path', limit: 100 }), [] as Point[]),
    settle(umami.get<Record<string, unknown>>('stats', { startAt, endAt, referrer: `c.${source}` }), null),
  ]);
  const s = parseStats(stats);
  return { visitors: s.visitors, visits: s.visits, landing: mapItems(groupPaths(paths, pages).pages, null, pages.labels, 20), referred: referred ? parseStats(referred).visits : null };
}
