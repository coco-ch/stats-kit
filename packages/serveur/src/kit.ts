/*
 * Point d'entrée côté serveur : `createStatsKit(réglages)` relie les connecteurs, le cache, le rapport et les routes HTTP.
 * Aucun framework imposé : `handle()` répond à une requête décrite simplement ; `middleware()` s'accroche à Express ou à
 * `node:http`.
 */
import { readFileSync } from 'node:fs';
import { textes, type IndexationResponse, type Item, type LiveResponse, type ReportPreview, type ReportSendResult, type SearchOverview, type StatsOverview, type TextOverrides, type Texts, type World, type YoutubeOverview } from 'stats-kit/contrat';
import { buildOverview, sourceVisits, type OverviewOptions } from './apercu.ts';
import { gscClient, gscConfigured, emptySearch, searchPeriod, type GscClient, type GscConfig } from './gsc.ts';
import { Cache, errorMessage, type Fetch } from './http.ts';
import { buildReport, previewHtml, type ReportMessage } from './rapport/rapport.ts';
import { loadWorld, worldFile } from './rapport/carte-png.ts';
import type { ReportTheme } from './rapport/theme.ts';
import { resolveRange, type RangeQuery } from './temps.ts';
import { umamiClient, umamiConfigured, type UmamiClient, type UmamiConfig } from './umami.ts';
import { emptyYoutube, youtubeClient, youtubeConfigured, type SiteCounter, type YoutubeClient, type YoutubeConfig } from './youtube.ts';

export interface ReportConfig {
  /** Couleurs et logo (défaut : bleu neutre). */
  theme?: ReportTheme;
  /** Page Statistiques de l'administration, ouverte par le bouton du rapport. */
  statsUrl?: string | null;
  /** Jours couverts par défaut (7). */
  days?: number;
  /**
   * Envoi du message, fait par le site (SMTP, API…) : la librairie n'envoie rien elle-même. Renvoie le nombre de destinataires
   * (ou rien). Sans cette fonction, la route d'envoi répond 503.
   */
  send?: (message: ReportMessage) => Promise<number | void>;
  /** Ajoute le bloc Google (true par défaut, si la Search Console est branchée). */
  search?: boolean;
  /** Ajoute le bloc YouTube (true par défaut, si la chaîne est branchée). */
  youtube?: boolean;
}

export interface StatsKitConfig extends Omit<OverviewOptions, 'timeZone' | 'dashboardUrl'> {
  /** Nom du site (en-tête et objet du rapport). */
  siteName: string;
  /** Langue des textes : « fr » (défaut), « en », ou une autre avec `baseTexts`. */
  locale?: string;
  /** Remplacements de textes (réglages du site). */
  texts?: TextOverrides;
  /** Textes complets d'une autre langue. */
  baseTexts?: Texts;
  /** Fuseau des créneaux et du rapport (« Europe/Paris ») ; UTC par défaut. */
  timeZone?: string;
  umami?: UmamiConfig | null;
  gsc?: GscConfig | null;
  youtube?: YoutubeConfig | null;
  /** Demandes enregistrées par le site après une visite venue d'une source (`utm_source`), pour la page YouTube. */
  sourceRequests?: (from: number, to: number, source: string) => Promise<{ total: number; bySubject: Item[] }>;
  report?: ReportConfig;
  /** Durée de vie du cache de la vue d'ensemble (2 minutes par défaut). */
  cacheTtlMs?: number;
  /** `fetch` à utiliser (tests, proxy). */
  fetch?: Fetch;
  /** Horloge (tests). */
  now?: () => number;
  /** Fond de carte (défaut : celui livré avec la librairie) ; `null` pour un rapport sans carte. */
  world?: World | URL | string | null;
}

/** Requête HTTP réduite à ce dont les routes ont besoin. */
export interface KitRequest {
  method: string;
  /** Chemin relatif au point de montage (« /overview »). */
  path: string;
  query: Record<string, string | undefined>;
}
export interface KitResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface StatsKit {
  readonly texts: Texts;
  overview(q?: RangeQuery): Promise<StatsOverview>;
  live(): Promise<LiveResponse>;
  search(q?: RangeQuery): Promise<SearchOverview>;
  indexation(): Promise<IndexationResponse>;
  youtube(days?: number): Promise<YoutubeOverview>;
  /** Rapport des `days` derniers jours (7 par défaut). */
  report(q?: RangeQuery, weekly?: boolean): Promise<ReportMessage>;
  /** Construit le rapport et le remet à `report.send`. */
  sendReport(q?: RangeQuery, weekly?: boolean): Promise<ReportSendResult>;
  /** Fond de carte (GeoJSON) servi aux composants. */
  worldJson(): string | null;
  handle(req: KitRequest): Promise<KitResponse>;
  /** Intergiciel Express / `node:http` : `app.use('/api/admin/audience', protégé, kit.middleware())`. */
  middleware(): (req: { method?: string; url?: string }, res: NodeResponse, next?: (err?: unknown) => void) => void;
}

/** Ce que l'intergiciel utilise de la réponse Node. */
export interface NodeResponse {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body?: string): unknown;
}

export function createStatsKit(config: StatsKitConfig): StatsKit {
  const now = config.now ?? Date.now;
  const tz = config.timeZone ?? 'UTC';
  const texts = textes(config.locale ?? 'fr', config.texts, config.baseTexts);
  const fetchFn = config.fetch ?? ((input: string, init?: RequestInit) => fetch(input, init));
  const umami: UmamiClient | null = umamiConfigured(config.umami) ? umamiClient(config.umami, fetchFn) : null;
  const gsc: GscClient | null = gscConfigured(config.gsc) ? gscClient(config.gsc, fetchFn) : null;
  const yt: YoutubeClient | null = youtubeConfigured(config.youtube) ? youtubeClient(config.youtube, fetchFn) : null;
  const cache = new Cache(now);
  const ttl = config.cacheTtlMs ?? 120_000;
  const dashboardUrl = umami && config.umami?.dashboardUrl !== false
    ? (config.umami?.dashboardUrl || `${config.umami!.url.replace(/\/+$/, '')}/websites/${config.umami!.websiteId}`)
    : null;

  let world: World | null | undefined;
  let worldText: string | null | undefined;
  const getWorld = (): World | null => {
    if (world !== undefined) return world;
    try {
      const w = config.world;
      world = w === null ? null : w && typeof w === 'object' && 'features' in w ? w : loadWorld(w ?? undefined);
    } catch {
      world = null; // sans fond de carte, le rapport part sans carte plutôt que de ne pas partir
    }
    return world;
  };

  const overview = (q: RangeQuery = {}): Promise<StatsOverview> => {
    const range = resolveRange(q, tz, now());
    const key = typeof q.from === 'string' ? `r:${range.from}:${range.to}` : `d:${range.days}`;
    return cache.get(`overview:${key}`, ttl, () => buildOverview(umami, range, { ...config, timeZone: tz, dashboardUrl }, now()));
  };

  const live = async (): Promise<LiveResponse> => {
    let active: number | null = null;
    if (umami) {
      try {
        const a = await umami.get<{ visitors?: number; x?: number }>('active');
        active = a.visitors ?? a.x ?? 0;
      } catch {
        active = null;
      }
    }
    return { version: 1, active, at: new Date(now()).toISOString() };
  };

  const search = (q: RangeQuery = {}): Promise<SearchOverview> =>
    gsc ? gsc.overview(q, now()) : Promise.resolve(emptySearch('not-configured', null, searchPeriod(q, now()), config.gsc, now()));

  const indexation = async (): Promise<IndexationResponse> =>
    gsc ? gsc.indexation(now()) : { version: 1, status: 'not-configured', error: null, checkedAt: new Date(now()).toISOString(), total: 0, indexed: 0, pages: [] };

  const siteCounter: SiteCounter = {
    visits: umami ? (a, b, source) => sourceVisits(umami, a, b, source, config.pages) : undefined,
    requests: config.sourceRequests,
  };
  const youtube = (days = 28): Promise<YoutubeOverview> =>
    yt ? yt.overview(days, siteCounter, now()) : Promise.resolve(emptyYoutube('not-configured', null, days, config.youtube?.channelUrl ?? null, now()));

  async function report(q: RangeQuery = {}, weekly = false): Promise<ReportMessage> {
    const r = config.report ?? {};
    const days = q.days ?? (q.from ? undefined : (r.days ?? 7));
    const o = await overview({ ...q, days });
    const withSearch = r.search !== false && gsc ? await search({ days: o.range.days }) : null;
    const withYoutube = r.youtube !== false && yt ? await youtube(Math.min(90, o.range.days)) : null;
    let top: { title: string; url: string; views: number } | null = null;
    if (yt && withYoutube?.status === 'ok' && withYoutube.totals.views) top = await yt.topVideo(withYoutube.start, withYoutube.end).catch(() => null);
    return buildReport({
      overview: o, search: withSearch, youtube: withYoutube, youtubeTop: top, texts, theme: r.theme ?? { brand: '#2f5bd3' },
      siteName: config.siteName, statsUrl: r.statsUrl ?? null, weekly, world: getWorld(),
    });
  }

  async function sendReport(q: RangeQuery = {}, weekly = false): Promise<ReportSendResult> {
    const send = config.report?.send;
    if (!send) return { version: 1, ok: false, recipients: 0, error: 'send-not-configured' };
    try {
      const n = await send(await report(q, weekly));
      return { version: 1, ok: true, recipients: typeof n === 'number' ? n : 0, error: null };
    } catch (e) {
      return { version: 1, ok: false, recipients: 0, error: errorMessage(e) };
    }
  }

  const worldJson = (): string | null => {
    if (worldText !== undefined) return worldText;
    const w = config.world;
    try {
      worldText = w === null ? null : w && typeof w === 'object' && 'features' in w ? JSON.stringify(w) : readFileSync(w ?? worldFile(), 'utf8');
    } catch {
      worldText = null;
    }
    return worldText;
  };

  const jsonResponse = (status: number, body: unknown, maxAge = 0): KitResponse => ({
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': maxAge ? `private, max-age=${maxAge}` : 'no-store', 'X-Content-Type-Options': 'nosniff' },
    body: JSON.stringify(body),
  });

  async function handle(req: KitRequest): Promise<KitResponse> {
    const path = req.path.replace(/\/+$/, '') || '/';
    const q = req.query;
    const range: RangeQuery = { days: q['days'], from: q['from'], to: q['to'] };
    const method = req.method.toUpperCase();
    try {
      if (method === 'GET') {
        switch (path) {
          case '/':
          case '/overview': return jsonResponse(200, await overview(range));
          case '/live': return jsonResponse(200, await live());
          case '/search': return jsonResponse(200, await search(range));
          case '/search/indexation': return jsonResponse(200, await indexation());
          case '/youtube': return jsonResponse(200, await youtube(Number(q['days']) || 28));
          case '/report/preview': {
            const m = await report(range);
            const body: ReportPreview = { version: 1, subject: m.subject, html: previewHtml(m), text: m.text };
            return jsonResponse(200, body);
          }
          case '/world.json': {
            const w = worldJson();
            return w ? { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=604800' }, body: w } : jsonResponse(404, { error: 'not-found' });
          }
        }
      }
      if (method === 'POST' && path === '/report/send') {
        const r = await sendReport(range);
        return jsonResponse(r.ok ? 200 : r.error === 'send-not-configured' ? 503 : 502, r);
      }
      return jsonResponse(404, { error: 'not-found' });
    } catch (e) {
      console.error('[stats-kit]', e);
      return jsonResponse(500, { error: 'internal-error' });
    }
  }

  const middleware = () => (req: { method?: string; url?: string }, res: NodeResponse, next?: (err?: unknown) => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (query[k] = v));
    handle({ method: req.method ?? 'GET', path: url.pathname, query })
      .then((r) => {
        if (r.status === 404 && next) return next(); // route inconnue : on laisse la main au reste de l'application
        res.statusCode = r.status;
        for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
        res.end(r.body);
      })
      .catch((e: unknown) => (next ? next(e) : ((res.statusCode = 500), res.end())));
  };

  return { texts, overview, live, search, indexation, youtube, report, sendReport, worldJson, handle, middleware };
}
